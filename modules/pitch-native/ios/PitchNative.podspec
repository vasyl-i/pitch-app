Pod::Spec.new do |s|
  s.name           = 'PitchNative'
  s.version        = '1.0.0'
  s.summary        = 'Native pitch detection DSP for Pitch Coach'
  s.description    = 'YIN pitch detection, FIR decimation, voice gate in C'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,c,m,mm,swift,hpp,cpp}"
end
