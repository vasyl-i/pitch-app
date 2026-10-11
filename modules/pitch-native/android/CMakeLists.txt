cmake_minimum_required(VERSION 3.13)
project(pitch_core C)

add_library(pitch_core SHARED
    ../ios/pitch_core.c
    pitch_core_jni.c
)

target_include_directories(pitch_core PRIVATE ../ios)

find_library(log-lib log)
target_link_libraries(pitch_core ${log-lib})
