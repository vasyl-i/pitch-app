import ExpoModulesCore

public class PitchNativeModule: Module {
  private var processors: [Int: UnsafeMutablePointer<PitchProcessorState>] = [:]
  private var gates: [Int: UnsafeMutablePointer<VoiceGateState>] = [:]
  private var nextId = 1

  public func definition() -> ModuleDefinition {
    Name("PitchNative")

    // --- Processor lifecycle ---

    Function("createProcessor") { () -> Int in
      let id = self.nextId
      self.nextId += 1
      let ptr = UnsafeMutablePointer<PitchProcessorState>.allocate(capacity: 1)
      pitch_processor_init(ptr)
      self.processors[id] = ptr
      return id
    }

    Function("resetProcessor") { (id: Int) in
      guard let ptr = self.processors[id] else { return }
      pitch_processor_reset(ptr)
    }

    Function("destroyProcessor") { (id: Int) in
      guard let ptr = self.processors[id] else { return }
      ptr.deallocate()
      self.processors.removeValue(forKey: id)
    }

    // --- Main frame processing ---

    Function("processFrame") { (id: Int, samples: [Double], sampleRate: Int) -> [String: Any]? in
      guard let ptr = self.processors[id] else { return nil }
      var floats = samples.map { Float($0) }
      var result = PitchResult()
      let valid = pitch_processor_process(
        ptr,
        &floats,
        Int32(floats.count),
        Int32(sampleRate),
        &result
      )
      if valid == 0 { return nil }

      var dict: [String: Any] = [
        "rms": Double(result.rms),
        "clarity": Double(result.clarity),
        "clipped": result.clipped != 0
      ]
      if result.has_frequency != 0 {
        dict["frequency"] = Double(result.frequency)
      }
      return dict
    }

    // --- Voice gate lifecycle ---

    Function("createVoiceGate") { () -> Int in
      let id = self.nextId
      self.nextId += 1
      let ptr = UnsafeMutablePointer<VoiceGateState>.allocate(capacity: 1)
      voice_gate_init(ptr)
      self.gates[id] = ptr
      return id
    }

    Function("voiceGateAccept") { (id: Int, rms: Double, midi: Double, hasMidi: Bool, nowMs: Double) -> Bool in
      guard let ptr = self.gates[id] else { return false }
      return voice_gate_accept(
        ptr,
        Float(rms),
        Float(midi),
        hasMidi ? 1 : 0,
        nowMs
      ) != 0
    }

    Function("voiceGateConfirm") { (id: Int, midi: Double, nowMs: Double) in
      guard let ptr = self.gates[id] else { return }
      voice_gate_confirm(ptr, Float(midi), nowMs)
    }

    Function("voiceGateReset") { (id: Int) in
      guard let ptr = self.gates[id] else { return }
      voice_gate_reset(ptr)
    }

    Function("destroyVoiceGate") { (id: Int) in
      guard let ptr = self.gates[id] else { return }
      ptr.deallocate()
      self.gates.removeValue(forKey: id)
    }

    OnDestroy {
      for (_, ptr) in self.processors { ptr.deallocate() }
      for (_, ptr) in self.gates { ptr.deallocate() }
      self.processors.removeAll()
      self.gates.removeAll()
    }
  }
}
