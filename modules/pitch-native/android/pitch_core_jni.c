/**
 * JNI bridge for pitch_core — thin wrappers that unpack Java arrays,
 * call the C core, and pack results back.
 */

#include <jni.h>
#include "pitch_core.h"
#include <stdlib.h>

/* Each processor/gate is heap-allocated; the Java side holds the pointer as a long. */

JNIEXPORT jlong JNICALL
Java_expo_modules_pitchnative_PitchNativeModule_nativeCreateProcessor(JNIEnv *env, jobject thiz) {
    PitchProcessorState *state = (PitchProcessorState *)malloc(sizeof(PitchProcessorState));
    pitch_processor_init(state);
    return (jlong)(intptr_t)state;
}

JNIEXPORT void JNICALL
Java_expo_modules_pitchnative_PitchNativeModule_nativeResetProcessor(JNIEnv *env, jobject thiz, jlong ptr) {
    PitchProcessorState *state = (PitchProcessorState *)(intptr_t)ptr;
    if (state) pitch_processor_reset(state);
}

JNIEXPORT void JNICALL
Java_expo_modules_pitchnative_PitchNativeModule_nativeDestroyProcessor(JNIEnv *env, jobject thiz, jlong ptr) {
    PitchProcessorState *state = (PitchProcessorState *)(intptr_t)ptr;
    if (state) free(state);
}

/**
 * Returns a float[5]: [hasFrequency, frequency, rms, clarity, clipped]
 * Returns null if window not yet filled.
 */
JNIEXPORT jfloatArray JNICALL
Java_expo_modules_pitchnative_PitchNativeModule_nativeProcessFrame(
    JNIEnv *env, jobject thiz, jlong ptr, jfloatArray samples, jint sampleRate
) {
    PitchProcessorState *state = (PitchProcessorState *)(intptr_t)ptr;
    if (!state) return NULL;

    jint len = (*env)->GetArrayLength(env, samples);
    jfloat *data = (*env)->GetFloatArrayElements(env, samples, NULL);

    PitchResult result;
    int valid = pitch_processor_process(state, data, len, sampleRate, &result);

    (*env)->ReleaseFloatArrayElements(env, samples, data, JNI_ABORT);

    if (!valid) return NULL;

    jfloatArray out = (*env)->NewFloatArray(env, 5);
    jfloat vals[5] = {
        (jfloat)result.has_frequency,
        result.frequency,
        result.rms,
        result.clarity,
        (jfloat)result.clipped
    };
    (*env)->SetFloatArrayRegion(env, out, 0, 5, vals);
    return out;
}

/* Voice gate */

JNIEXPORT jlong JNICALL
Java_expo_modules_pitchnative_PitchNativeModule_nativeCreateVoiceGate(JNIEnv *env, jobject thiz) {
    VoiceGateState *state = (VoiceGateState *)malloc(sizeof(VoiceGateState));
    voice_gate_init(state);
    return (jlong)(intptr_t)state;
}

JNIEXPORT jboolean JNICALL
Java_expo_modules_pitchnative_PitchNativeModule_nativeVoiceGateAccept(
    JNIEnv *env, jobject thiz, jlong ptr,
    jfloat rms, jfloat midi, jboolean hasMidi, jdouble nowMs
) {
    VoiceGateState *state = (VoiceGateState *)(intptr_t)ptr;
    if (!state) return JNI_FALSE;
    return voice_gate_accept(state, rms, midi, hasMidi ? 1 : 0, nowMs) ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT void JNICALL
Java_expo_modules_pitchnative_PitchNativeModule_nativeVoiceGateConfirm(
    JNIEnv *env, jobject thiz, jlong ptr, jfloat midi, jdouble nowMs
) {
    VoiceGateState *state = (VoiceGateState *)(intptr_t)ptr;
    if (state) voice_gate_confirm(state, midi, nowMs);
}

JNIEXPORT void JNICALL
Java_expo_modules_pitchnative_PitchNativeModule_nativeVoiceGateReset(JNIEnv *env, jobject thiz, jlong ptr) {
    VoiceGateState *state = (VoiceGateState *)(intptr_t)ptr;
    if (state) voice_gate_reset(state);
}

JNIEXPORT void JNICALL
Java_expo_modules_pitchnative_PitchNativeModule_nativeDestroyVoiceGate(JNIEnv *env, jobject thiz, jlong ptr) {
    VoiceGateState *state = (VoiceGateState *)(intptr_t)ptr;
    if (state) free(state);
}
