/**
 * pitch_core.h — portable C core for pitch detection DSP.
 *
 * Contains: FIR decimation, RMS, YIN pitch detection, voice gate.
 * Called from Swift (iOS) and Kotlin/JNI (Android) wrappers.
 */

#ifndef PITCH_CORE_H
#define PITCH_CORE_H

#ifdef __cplusplus
extern "C" {
#endif

/* ------------------------------------------------------------------ *
 * Constants                                                           *
 * ------------------------------------------------------------------ */

#define PC_N_TAPS       24
#define PC_DECIMATE     4
#define PC_WINDOW       512
#define PC_CARRY_MAX    (PC_N_TAPS - 1)   /* 23 */
#define PC_RMS_HISTORY  860

/* ------------------------------------------------------------------ *
 * Pitch processor (FIR + sliding window + YIN)                        *
 * ------------------------------------------------------------------ */

typedef struct {
    float carry[PC_CARRY_MAX];
    int   carry_len;
    float window[PC_WINDOW];
    int   filled;
} PitchProcessorState;

typedef struct {
    float frequency;    /* 0 if no pitch detected */
    int   has_frequency;
    float rms;
    float clarity;
    int   clipped;
} PitchResult;

void pitch_processor_init(PitchProcessorState *state);
void pitch_processor_reset(PitchProcessorState *state);

/**
 * Process one raw audio frame (44.1kHz, typically 512 samples).
 * Decimates, slides into analysis window, runs YIN.
 * Returns 1 if result is valid (window filled), 0 otherwise.
 */
int pitch_processor_process(
    PitchProcessorState *state,
    const float *raw_samples,
    int sample_count,
    int sample_rate,
    PitchResult *out
);

/* ------------------------------------------------------------------ *
 * Standalone YIN (for testing)                                        *
 * ------------------------------------------------------------------ */

/**
 * Run YIN on a pre-decimated buffer.
 * Returns 1 if pitch found, 0 otherwise.
 */
int yin_detect(
    const float *buffer,
    int length,
    float sample_rate,
    float *out_frequency,
    float *out_rms,
    float *out_clarity
);

/* ------------------------------------------------------------------ *
 * Voice gate                                                          *
 * ------------------------------------------------------------------ */

typedef struct {
    float  rms_history[PC_RMS_HISTORY];
    int    rms_count;
    int    rms_start;       /* circular buffer write index */
    float  last_voice_midi;
    double last_voice_at;   /* ms timestamp */
    int    has_last_voice;
} VoiceGateState;

void voice_gate_init(VoiceGateState *state);
void voice_gate_reset(VoiceGateState *state);

/**
 * Returns 1 if the frame is accepted as voice, 0 otherwise.
 * midi = -1 and has_midi = 0 when no pitch detected.
 */
int voice_gate_accept(
    VoiceGateState *state,
    float rms,
    float midi,
    int has_midi,
    double now_ms
);

void voice_gate_confirm(
    VoiceGateState *state,
    float midi,
    double now_ms
);

#ifdef __cplusplus
}
#endif

#endif /* PITCH_CORE_H */
