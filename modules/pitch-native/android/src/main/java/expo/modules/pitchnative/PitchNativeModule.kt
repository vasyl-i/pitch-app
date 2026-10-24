package expo.modules.pitchnative

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.typedarray.Float32Array
import java.nio.ByteBuffer

class PitchNativeModule : Module() {
    private val processors = mutableMapOf<Int, Long>()
    private val gates = mutableMapOf<Int, Long>()
    private var nextId = 1

    private external fun nativeCreateProcessor(): Long
    private external fun nativeResetProcessor(ptr: Long)
    private external fun nativeDestroyProcessor(ptr: Long)
    private external fun nativeProcessFrame(ptr: Long, samples: FloatArray, sampleRate: Int): FloatArray?
    private external fun nativeProcessSamples(
        ptr: Long, gate: Long, samples: ByteBuffer, count: Int, sampleRate: Int, nowMs: Double, confirm: Boolean, out: ByteBuffer
    ): Boolean

    private external fun nativeCreateVoiceGate(): Long
    private external fun nativeVoiceGateAccept(ptr: Long, rms: Float, midi: Float, hasMidi: Boolean, nowMs: Double): Boolean
    private external fun nativeVoiceGateConfirm(ptr: Long, midi: Float, nowMs: Double)
    private external fun nativeVoiceGateReset(ptr: Long)
    private external fun nativeDestroyVoiceGate(ptr: Long)

    companion object {
        init {
            System.loadLibrary("pitch_core")
        }
    }

    override fun definition() = ModuleDefinition {
        Name("PitchNative")

        Function("createProcessor") {
            val id = nextId++
            processors[id] = nativeCreateProcessor()
            id
        }

        Function("resetProcessor") { id: Int ->
            processors[id]?.let { nativeResetProcessor(it) }
        }

        Function("destroyProcessor") { id: Int ->
            processors[id]?.let { nativeDestroyProcessor(it) }
            processors.remove(id)
        }

        Function("processFrame") { id: Int, samples: List<Double>, sampleRate: Int ->
            val ptr = processors[id] ?: return@Function null
            val floats = FloatArray(samples.size) { samples[it].toFloat() }
            val result = nativeProcessFrame(ptr, floats, sampleRate) ?: return@Function null

            val dict = mutableMapOf<String, Any>(
                "rms" to result[2].toDouble(),
                "clarity" to result[3].toDouble(),
                "clipped" to (result[4].toInt() != 0)
            )
            if (result[0].toInt() != 0) {
                dict["frequency"] = result[1].toDouble()
            }
            dict
        }

        // the per-frame call: reads the recorder's Float32Array in place, detects
        // pitch and, given a gate (gateId 0 = none), runs the voice gate on the
        // result — confirming a voiced frame's pitch when `confirm` is set.
        // Writes [hasFrequency, frequency, rms, clarity, clipped, voiced] into
        // `out` (a reused Float32Array of 6): one call, no boxing, no map out
        Function("processSamples") { id: Int, samples: Float32Array, sampleRate: Int, out: Float32Array, gateId: Int, nowMs: Double, confirm: Boolean ->
            val ptr = processors[id]
            if (ptr == null || out.length < 6) {
                false
            } else {
                val gate = if (gateId == 0) 0L else (gates[gateId] ?: 0L)
                nativeProcessSamples(ptr, gate, samples.toDirectBuffer(), samples.length, sampleRate, nowMs, confirm, out.toDirectBuffer())
            }
        }

        Function("createVoiceGate") {
            val id = nextId++
            gates[id] = nativeCreateVoiceGate()
            id
        }

        Function("voiceGateAccept") { id: Int, rms: Double, midi: Double, hasMidi: Boolean, nowMs: Double ->
            val ptr = gates[id] ?: return@Function false
            nativeVoiceGateAccept(ptr, rms.toFloat(), midi.toFloat(), hasMidi, nowMs)
        }

        Function("voiceGateConfirm") { id: Int, midi: Double, nowMs: Double ->
            val ptr = gates[id] ?: return@Function
            nativeVoiceGateConfirm(ptr, midi.toFloat(), nowMs)
        }

        Function("voiceGateReset") { id: Int ->
            val ptr = gates[id] ?: return@Function
            nativeVoiceGateReset(ptr)
        }

        Function("destroyVoiceGate") { id: Int ->
            gates[id]?.let { nativeDestroyVoiceGate(it) }
            gates.remove(id)
        }

        OnDestroy {
            processors.values.forEach { nativeDestroyProcessor(it) }
            gates.values.forEach { nativeDestroyVoiceGate(it) }
            processors.clear()
            gates.clear()
        }
    }
}
