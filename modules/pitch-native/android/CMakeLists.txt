cmake_minimum_required(VERSION 3.13)
project(pitch_core C)

add_library(pitch_core SHARED
    ../ios/pitch_core.c
    pitch_core_jni.c
)

target_include_directories(pitch_core PRIVATE ../ios)

find_library(log-lib log)
target_link_libraries(pitch_core ${log-lib})

# Google Play requires 16 KB page-size compatible native libs (Android 15+).
# NDK r28+ does this by default; RN 0.86 still ships r27, which aligns to 4 KB.
target_link_options(pitch_core PRIVATE "-Wl,-z,max-page-size=16384")
