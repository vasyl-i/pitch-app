import CoreHaptics
import ExpoModulesCore

/**
 * The metronome's tap, on Core Haptics rather than UIFeedbackGenerator.
 *
 * expo-haptics builds a fresh generator per call and plays it on the main
 * queue — the thread that also draws the pitch canvas — so taps arrive late
 * or not at all mid-run. Here one engine is kept running for the whole run
 * and a ready-made player is restarted on a private queue: no main thread,
 * no per-tap setup.
 */
public class HapticTickModule: Module {
  private let queue = DispatchQueue(label: "app.pitchcoach.haptic-tick", qos: .userInteractive)
  private var engine: CHHapticEngine?
  private var player: CHHapticPatternPlayer?
  /** a run wants the engine; restart it if the system resets it */
  private var wanted = false

  /** iPhone 8 and later; never iPad, never the simulator */
  private static let supported = CHHapticEngine.capabilitiesForHardware().supportsHaptics

  public func definition() -> ModuleDefinition {
    Name("HapticTick")

    Function("isSupported") { () -> Bool in
      Self.supported
    }

    Function("prepare") {
      self.queue.async {
        self.wanted = true
        self.startEngine()
      }
    }

    Function("release") {
      self.queue.async {
        self.wanted = false
        self.player = nil
        self.engine?.stop(completionHandler: nil)
        self.engine = nil
      }
    }

    Function("tick") {
      self.queue.async {
        if self.player == nil { self.startEngine() }
        try? self.player?.start(atTime: CHHapticTimeImmediate)
      }
    }

    OnDestroy {
      self.queue.async {
        self.player = nil
        self.engine?.stop(completionHandler: nil)
        self.engine = nil
      }
    }
  }

  /** on `queue` only */
  private func startEngine() {
    guard Self.supported, engine == nil else { return }
    do {
      let engine = try CHHapticEngine()
      // taps only: no audio resources, so the recording session is untouched
      engine.playsHapticsOnly = true
      // a beat is under a second apart; idling down between them adds latency
      engine.isAutoShutdownEnabled = false
      engine.stoppedHandler = { [weak self] _ in
        self?.queue.async {
          self?.player = nil
          self?.engine = nil
        }
      }
      engine.resetHandler = { [weak self] in
        self?.queue.async {
          guard let self else { return }
          self.player = nil
          self.engine = nil
          if self.wanted { self.startEngine() }
        }
      }
      try engine.start()

      // a short, crisp click — felt clearly, too brief to read as a note
      let tap = CHHapticEvent(
        eventType: .hapticTransient,
        parameters: [
          CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.6),
          CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.8),
        ],
        relativeTime: 0
      )
      player = try engine.makePlayer(with: CHHapticPattern(events: [tap], parameters: []))
      self.engine = engine
    } catch {
      player = nil
      self.engine = nil
    }
  }
}
