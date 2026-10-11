/**
 * pitch_core.c — portable C implementation of pitch detection DSP.
 *
 * Ported from the TypeScript implementations in:
 *   - src/features/pitch-detection/lib/yin.ts
 *   - src/features/pitch-detection/lib/pitchEngine.ts (FIR + decimation)
 *   - src/features/pitch-detection/lib/signal.ts (voice gate)
 *
 * All constants match the JS originals exactly.
 */

#include "pitch_core.h"
#include <math.h>
#include <string.h>
#include <stdlib.h>

/* ------------------------------------------------------------------ *
 * YIN constants                                                       *
 * ------------------------------------------------------------------ */

static const float THRESHOLD          = 0.12f;
static const float FALLBACK_THRESHOLD = 0.3f;
static const float MIN_FREQ           = 55.0f;
static const float RMS_GATE           = 0.002f;
static const float CLIP_THRESHOLD     = 0.985f;

/* Octave-low guard */
static const float OCTAVE_GUARD_MAX_CMND = 0.25f;
static const float OCTAVE_GUARD_RATIO    = 1.3f;

/* ------------------------------------------------------------------ *
 * FIR filter taps (precomputed from Hamming-windowed sinc,            *
 * cutoff = 0.125 normalized, 24 taps, unity DC gain)                  *
 * ------------------------------------------------------------------ */

static const float FIR_TAPS[PC_N_TAPS] = {
     0.0008454023f,
     0.0027119969f,
     0.0045388248f,
     0.0032315427f,
    -0.0053207590f,
    -0.0201496612f,
    -0.0304802172f,
    -0.0187433045f,
     0.0279605910f,
     0.1052484587f,
     0.1881453097f,
     0.2420118153f,
     0.2420118153f,
     0.1881453097f,
     0.1052484587f,
     0.0279605910f,
    -0.0187433045f,
    -0.0304802172f,
    -0.0201496612f,
    -0.0053207590f,
     0.0032315427f,
     0.0045388248f,
     0.0027119969f,
     0.0008454023f
};

/* ------------------------------------------------------------------ *
 * Voice gate constants                                                *
 * ------------------------------------------------------------------ */

static const float  VG_ENTER_FLOOR       = 1.7f;
static const float  VG_SUSTAIN_FLOOR     = 1.15f;
static const float  VG_ABS_MIN           = 0.004f;
static const double VG_CONTINUITY_MS     = 400.0;
static const float  VG_CONTINUITY_SEMI   = 1.2f;
static const float  VG_FLOOR_QUANTILE    = 0.1f;
static const int    VG_MIN_FLOOR_SAMPLES = 20;

/* ------------------------------------------------------------------ *
 * YIN implementation                                                  *
 * ------------------------------------------------------------------ */

int yin_detect(
    const float *buffer,
    int length,
    float sample_rate,
    float *out_frequency,
    float *out_rms,
    float *out_clarity
) {
    /* AC-coupled RMS: rms = sqrt(E[x^2] - E[x]^2) */
    float sum = 0.0f;
    float sum_sq = 0.0f;
    for (int i = 0; i < length; i++) {
        sum += buffer[i];
        sum_sq += buffer[i] * buffer[i];
    }
    float mean = sum / (float)length;
    float variance = sum_sq / (float)length - mean * mean;
    if (variance < 0.0f) variance = 0.0f;
    float rms = sqrtf(variance);

    *out_rms = rms;
    *out_clarity = 0.0f;
    *out_frequency = 0.0f;

    if (rms < RMS_GATE) return 0;

    int max_lag_from_freq = (int)floorf(sample_rate / MIN_FREQ);
    int max_lag = length - 1;
    if (max_lag_from_freq < max_lag) max_lag = max_lag_from_freq;

    /* Allocate difference and CMND arrays on the stack for small windows,
       heap for large. PC_WINDOW (512) is always small enough for stack. */
    float diff_buf[PC_WINDOW];
    float cmnd_buf[PC_WINDOW];
    float *diff = (max_lag <= PC_WINDOW) ? diff_buf : (float *)malloc(sizeof(float) * (size_t)max_lag);
    float *cmnd = (max_lag <= PC_WINDOW) ? cmnd_buf : (float *)malloc(sizeof(float) * (size_t)max_lag);

    /* Difference function */
    diff[0] = 0.0f;
    int integration_len = length - max_lag;
    for (int tau = 1; tau < max_lag; tau++) {
        float s = 0.0f;
        for (int i = 0; i < integration_len; i++) {
            float delta = buffer[i] - buffer[i + tau];
            s += delta * delta;
        }
        diff[tau] = s;
    }

    /* Cumulative mean normalized difference (CMND) */
    cmnd[0] = 1.0f;
    float running_sum = 0.0f;
    for (int tau = 1; tau < max_lag; tau++) {
        running_sum += diff[tau];
        cmnd[tau] = (running_sum == 0.0f) ? 1.0f : (diff[tau] * (float)tau) / running_sum;
    }

    /* Threshold search */
    int tau_estimate = -1;
    for (int tau = 2; tau < max_lag; tau++) {
        if (cmnd[tau] < THRESHOLD) {
            while (tau + 1 < max_lag && cmnd[tau + 1] < cmnd[tau]) tau++;
            tau_estimate = tau;
            break;
        }
    }

    /* Fallback: best local minimum under FALLBACK_THRESHOLD */
    if (tau_estimate == -1) {
        int best_tau = -1;
        float best_val = FALLBACK_THRESHOLD;
        for (int tau = 2; tau < max_lag; tau++) {
            if (cmnd[tau] < best_val) {
                best_val = cmnd[tau];
                best_tau = tau;
            }
        }
        if (best_tau == -1) {
            if (diff != diff_buf) { free(diff); free(cmnd); }
            return 0;
        }
        tau_estimate = best_tau;
    }

    /* Octave-low guard */
    int half_tau = (tau_estimate + 1) / 2; /* round */
    if (half_tau >= 2) {
        float limit = cmnd[tau_estimate] * OCTAVE_GUARD_RATIO;
        if (OCTAVE_GUARD_MAX_CMND < limit) limit = OCTAVE_GUARD_MAX_CMND;
        if (cmnd[half_tau] < limit) {
            tau_estimate = half_tau;
        }
    }

    float clarity = 1.0f - cmnd[tau_estimate];
    if (clarity < 0.0f) clarity = 0.0f;
    if (clarity > 1.0f) clarity = 1.0f;
    *out_clarity = clarity;

    /* Parabolic interpolation */
    float better_tau = (float)tau_estimate;
    if (tau_estimate > 0 && tau_estimate < max_lag - 1) {
        float s0 = cmnd[tau_estimate - 1];
        float s1 = cmnd[tau_estimate];
        float s2 = cmnd[tau_estimate + 1];
        float denom = 2.0f * (2.0f * s1 - s2 - s0);
        if (denom != 0.0f) {
            float adjustment = (s2 - s0) / denom;
            if (isfinite(adjustment)) {
                better_tau = (float)tau_estimate + adjustment;
            }
        }
    }

    *out_frequency = sample_rate / better_tau;

    if (diff != diff_buf) { free(diff); free(cmnd); }
    return 1;
}

/* ------------------------------------------------------------------ *
 * Pitch processor                                                     *
 * ------------------------------------------------------------------ */

void pitch_processor_init(PitchProcessorState *state) {
    memset(state, 0, sizeof(PitchProcessorState));
}

void pitch_processor_reset(PitchProcessorState *state) {
    state->carry_len = 0;
    state->filled = 0;
    memset(state->window, 0, sizeof(state->window));
    memset(state->carry, 0, sizeof(state->carry));
}

int pitch_processor_process(
    PitchProcessorState *state,
    const float *raw_samples,
    int sample_count,
    int sample_rate,
    PitchResult *out
) {
    memset(out, 0, sizeof(PitchResult));

    /* Clip detection on raw samples */
    int clipped = 0;
    for (int i = 0; i < sample_count; i++) {
        if (raw_samples[i] >= CLIP_THRESHOLD || raw_samples[i] <= -CLIP_THRESHOLD) {
            clipped = 1;
            break;
        }
    }
    out->clipped = clipped;

    /* Prepend carry buffer for FIR continuity */
    int raw_len = state->carry_len + sample_count;
    /* Use stack allocation for typical sizes (carry 23 + chunk 512 = 535) */
    float raw_stack[1024];
    float *raw = (raw_len <= 1024) ? raw_stack : (float *)malloc(sizeof(float) * (size_t)raw_len);

    if (state->carry_len > 0) {
        memcpy(raw, state->carry, sizeof(float) * (size_t)state->carry_len);
    }
    memcpy(raw + state->carry_len, raw_samples, sizeof(float) * (size_t)sample_count);

    /* FIR decimation: evaluate lowpass at every DECIMATE-th sample */
    int dec_len = (raw_len - PC_N_TAPS) / PC_DECIMATE;
    if (dec_len < 0) dec_len = 0;

    float dec_stack[256];
    float *decimated = (dec_len <= 256) ? dec_stack : (float *)malloc(sizeof(float) * (size_t)dec_len);

    for (int i = 0; i < dec_len; i++) {
        float acc = 0.0f;
        int base = i * PC_DECIMATE;
        for (int k = 0; k < PC_N_TAPS; k++) {
            acc += FIR_TAPS[k] * raw[base + k];
        }
        decimated[i] = acc;
    }

    /* Save unconsumed tail as carry for next frame */
    int consumed = dec_len * PC_DECIMATE;
    state->carry_len = raw_len - consumed;
    if (state->carry_len > PC_CARRY_MAX) state->carry_len = PC_CARRY_MAX;
    if (state->carry_len > 0) {
        memcpy(state->carry, raw + consumed, sizeof(float) * (size_t)state->carry_len);
    }

    if (raw != raw_stack) free(raw);

    /* Slide analysis window left, append decimated chunk */
    if (dec_len >= PC_WINDOW) {
        memcpy(state->window, decimated + dec_len - PC_WINDOW, sizeof(float) * PC_WINDOW);
        state->filled = PC_WINDOW;
    } else if (dec_len > 0) {
        memmove(state->window, state->window + dec_len, sizeof(float) * (size_t)(PC_WINDOW - dec_len));
        memcpy(state->window + PC_WINDOW - dec_len, decimated, sizeof(float) * (size_t)dec_len);
        state->filled += dec_len;
        if (state->filled > PC_WINDOW) state->filled = PC_WINDOW;
    }

    if (decimated != dec_stack) free(decimated);

    if (state->filled < PC_WINDOW) return 0;

    /* Run YIN on the filled window */
    float frequency, rms, clarity;
    int found = yin_detect(state->window, PC_WINDOW, (float)sample_rate / (float)PC_DECIMATE,
                           &frequency, &rms, &clarity);

    out->rms = rms;
    out->clarity = clarity;
    if (found) {
        out->frequency = frequency;
        out->has_frequency = 1;
    }

    return 1;
}

/* ------------------------------------------------------------------ *
 * Voice gate                                                          *
 * ------------------------------------------------------------------ */

static int compare_floats(const void *a, const void *b) {
    float fa = *(const float *)a;
    float fb = *(const float *)b;
    if (fa < fb) return -1;
    if (fa > fb) return 1;
    return 0;
}

void voice_gate_init(VoiceGateState *state) {
    memset(state, 0, sizeof(VoiceGateState));
}

void voice_gate_reset(VoiceGateState *state) {
    memset(state, 0, sizeof(VoiceGateState));
}

int voice_gate_accept(
    VoiceGateState *state,
    float rms,
    float midi,
    int has_midi,
    double now_ms
) {
    /* Compute noise floor from sorted RMS history */
    float floor_val = 0.0f;
    if (state->rms_count >= VG_MIN_FLOOR_SAMPLES) {
        /* Copy history for sorting */
        int count = state->rms_count;
        if (count > PC_RMS_HISTORY) count = PC_RMS_HISTORY;
        float sorted[PC_RMS_HISTORY];
        /* The circular buffer may wrap; copy linearly */
        if (state->rms_count <= PC_RMS_HISTORY) {
            memcpy(sorted, state->rms_history, sizeof(float) * (size_t)count);
        } else {
            /* Buffer has wrapped; start is at rms_start */
            int first_part = PC_RMS_HISTORY - state->rms_start;
            memcpy(sorted, state->rms_history + state->rms_start, sizeof(float) * (size_t)first_part);
            memcpy(sorted + first_part, state->rms_history, sizeof(float) * (size_t)state->rms_start);
            count = PC_RMS_HISTORY;
        }
        qsort(sorted, (size_t)count, sizeof(float), compare_floats);
        int idx = (int)floorf((float)count * VG_FLOOR_QUANTILE);
        if (idx >= count) idx = count - 1;
        floor_val = sorted[idx];
    }

    /* Check continuity with previous voice frame */
    int continues = 0;
    if (has_midi && state->has_last_voice) {
        double dt = now_ms - state->last_voice_at;
        float dp = fabsf(midi - state->last_voice_midi);
        if (dt < VG_CONTINUITY_MS && dp < VG_CONTINUITY_SEMI) {
            continues = 1;
        }
    }

    /* Two-level gate decision */
    float enter_thresh = floor_val * VG_ENTER_FLOOR;
    if (enter_thresh < VG_ABS_MIN) enter_thresh = VG_ABS_MIN;
    float sustain_thresh = floor_val * VG_SUSTAIN_FLOOR;
    if (sustain_thresh < VG_ABS_MIN) sustain_thresh = VG_ABS_MIN;

    int is_voice = has_midi && (rms > enter_thresh || (rms > sustain_thresh && continues));

    /* Only background (non-voice, non-mid-phrase) feeds the floor estimate */
    int mid_phrase = (now_ms - state->last_voice_at) < VG_CONTINUITY_MS;
    if (!is_voice && !mid_phrase) {
        /* Push into circular buffer */
        if (state->rms_count < PC_RMS_HISTORY) {
            state->rms_history[state->rms_count] = rms;
            state->rms_count++;
        } else {
            state->rms_history[state->rms_start] = rms;
            state->rms_start = (state->rms_start + 1) % PC_RMS_HISTORY;
        }
    }

    return is_voice;
}

void voice_gate_confirm(
    VoiceGateState *state,
    float midi,
    double now_ms
) {
    state->last_voice_midi = midi;
    state->last_voice_at = now_ms;
    state->has_last_voice = 1;
}
