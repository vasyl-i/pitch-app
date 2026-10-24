Pod::Spec.new do |s|
  s.name           = 'HapticTick'
  s.version        = '1.0.0'
  s.summary        = 'Low-latency metronome haptic for Pitch Coach'
  s.description    = 'A short transient tap on Core Haptics, played off the main thread'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.ios.frameworks = 'CoreHaptics'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
