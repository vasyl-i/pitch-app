package expo.modules.haptictick

import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

/**
 * The metronome's tap. Only a crisp predefined click counts as support: an old
 * rumble motor can't stop fast enough to mark a beat (a 20 ms buzz smears into
 * the next one), so on those phones the feature is hidden instead.
 */
class HapticTickModule : Module() {
  /** binder calls off the JS thread, in order */
  private val executor = Executors.newSingleThreadExecutor()

  private val vibrator: Vibrator? by lazy {
    val context = appContext.reactContext ?: return@lazy null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
  }

  /** null when the hardware can't play a short, sharp click */
  private val effect: VibrationEffect? by lazy {
    val vibrator = vibrator ?: return@lazy null
    if (!vibrator.hasVibrator()) return@lazy null
    when {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.R &&
        vibrator.areAllPrimitivesSupported(VibrationEffect.Composition.PRIMITIVE_CLICK) ->
        VibrationEffect.startComposition()
          .addPrimitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 0.7f)
          .compose()
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
        vibrator.areAllEffectsSupported(VibrationEffect.EFFECT_CLICK) == Vibrator.VIBRATION_EFFECT_SUPPORT_YES ->
        VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
      else -> null
    }
  }

  private fun vibrate(vibrator: Vibrator, effect: VibrationEffect) {
    // media usage: a metronome is part of the practice, not touch feedback,
    // so it isn't silenced by the "touch vibration" setting
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_MEDIA))
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(
        effect,
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
    }
  }

  override fun definition() = ModuleDefinition {
    Name("HapticTick")

    Function("isSupported") {
      effect != null
    }

    // the vibrator service needs no warming up; kept for parity with iOS
    Function("prepare") {}

    Function("release") {}

    Function("tick") {
      val vibrator = vibrator
      val effect = effect
      if (vibrator != null && effect != null) {
        try {
          executor.execute { vibrate(vibrator, effect) }
        } catch (_: RejectedExecutionException) {
          // the module is being torn down
        }
      }
    }

    OnDestroy {
      executor.shutdown()
    }
  }
}
