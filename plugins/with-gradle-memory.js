/**
 * Expo config plugin: give the Android Gradle build more JVM memory.
 *
 * The Expo template default (-Xmx2048m -XX:MaxMetaspaceSize=512m) runs out of
 * Metaspace on release builds of this app (Skia, Reanimated, Firebase, R8 with
 * minify + shrinkResources). Gradle then fails `minifyReleaseWithR8` and the
 * daemon can hang on shutdown instead of exiting, so a local `eas build` never
 * finishes. Seen on 1.3.9 (Nov 2026).
 */
const { withGradleProperties } = require('@expo/config-plugins');

const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8';

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'org.gradle.jvmargs'),
    );
    props.push({ type: 'property', key: 'org.gradle.jvmargs', value: JVM_ARGS });
    config.modResults = props;
    return config;
  });
};
