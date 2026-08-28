/**
 * Replaces expo-splash-screen's iOS config plugin entirely.
 * Generates a two-layer SplashScreen.storyboard:
 *   1. Background image (SplashScreenBgImage) — fills the entire screen
 *   2. Content image (SplashScreenLogo) — centered, resizable with the screen
 *
 * Also creates the required imagesets and color set from source assets.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STORYBOARD_XML = `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="24765" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="EXPO-VIEWCONTROLLER-1">
    <device id="retina6_12" orientation="portrait" appearance="light"/>
    <dependencies>
        <deployment identifier="iOS"/>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="24743"/>
        <capability name="Named colors" minToolsVersion="9.0"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <scene sceneID="EXPO-SCENE-1">
            <objects>
                <viewController storyboardIdentifier="SplashScreenViewController" id="EXPO-VIEWCONTROLLER-1" sceneMemberID="viewController">
                    <view key="view" userInteractionEnabled="NO" contentMode="scaleToFill" insetsLayoutMarginsFromSafeArea="NO" id="EXPO-ContainerView" userLabel="ContainerView">
                        <rect key="frame" x="0.0" y="0.0" width="393" height="852"/>
                        <autoresizingMask key="autoresizingMask" flexibleMaxX="YES" flexibleMaxY="YES"/>
                        <subviews>
                            <imageView clipsSubviews="YES" userInteractionEnabled="NO" contentMode="scaleAspectFill" fixedFrame="YES" image="SplashScreenBgImage" translatesAutoresizingMaskIntoConstraints="NO" id="EXPO-SplashScreenBg" userLabel="SplashScreenBackground">
                                <rect key="frame" x="0.0" y="0.0" width="393" height="852"/>
                                <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                            </imageView>
                            <imageView clipsSubviews="YES" userInteractionEnabled="NO" contentMode="scaleAspectFit" horizontalHuggingPriority="251" verticalHuggingPriority="251" fixedFrame="YES" image="SplashScreenLogo" translatesAutoresizingMaskIntoConstraints="NO" id="EXPO-SplashScreen" userLabel="SplashScreenLogo">
                                <rect key="frame" x="17" y="350" width="358" height="179"/>
                                <autoresizingMask key="autoresizingMask" flexibleMinX="YES" flexibleMaxX="YES" flexibleMinY="YES" flexibleMaxY="YES"/>
                            </imageView>
                        </subviews>
                        <viewLayoutGuide key="safeArea" id="Rmq-lb-GrQ"/>
                        <color key="backgroundColor" name="SplashScreenBackground"/>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="EXPO-PLACEHOLDER-1" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
            <point key="canvasLocation" x="0.0" y="0.0"/>
        </scene>
    </scenes>
    <resources>
        <image name="SplashScreenBgImage" width="430" height="932"/>
        <image name="SplashScreenLogo" width="400" height="276"/>
        <namedColor name="SplashScreenBackground">
            <color red="0.031372550874948502" green="0.027450980618596077" blue="0.047058824449777603" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>
        </namedColor>
    </resources>
</document>`;

function generateImageset(dir, src, filenames, sizes) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dir, { recursive: true });

  for (let i = 0; i < sizes.length; i++) {
    const dest = path.join(dir, filenames[i]);
    if (sizes[i] === 'copy') {
      fs.copyFileSync(src, dest);
    } else {
      try {
        execSync(`magick "${src}" -resize ${sizes[i]} "${dest}"`, { stdio: 'ignore' });
      } catch {
        fs.copyFileSync(src, dest);
      }
    }
  }

  fs.writeFileSync(path.join(dir, 'Contents.json'), JSON.stringify({
    images: [
      { idiom: 'universal', filename: filenames[0], scale: '1x' },
      { idiom: 'universal', filename: filenames[1], scale: '2x' },
      { idiom: 'universal', filename: filenames[2], scale: '3x' },
    ],
    info: { version: 1, author: 'expo' },
  }, null, 2));
}

function ensureColorset(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'Contents.json'), JSON.stringify({
    colors: [{
      idiom: 'universal',
      color: {
        'color-space': 'srgb',
        components: {
          red: '0.031',
          green: '0.027',
          blue: '0.047',
          alpha: '1.000',
        },
      },
    }],
    info: { version: 1, author: 'expo' },
  }, null, 2));
}

module.exports = function withSplashCover(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const iosProjectPath = path.join(
        cfg.modRequest.platformProjectRoot,
        cfg.modRequest.projectName
      );
      const xcassets = path.join(iosProjectPath, 'Images.xcassets');
      const projectRoot = cfg.modRequest.projectRoot;

      // 1. Write storyboard
      fs.writeFileSync(
        path.join(iosProjectPath, 'SplashScreen.storyboard'),
        STORYBOARD_XML
      );

      // 2. Generate background imageset
      generateImageset(
        path.join(xcassets, 'SplashScreenBgImage.imageset'),
        path.join(projectRoot, 'assets', 'splash-background.png'),
        ['bg.png', 'bg@2x.png', 'bg@3x.png'],
        ['430x932', '860x1864', 'copy']
      );

      // 3. Generate content imageset
      generateImageset(
        path.join(xcassets, 'SplashScreenLogo.imageset'),
        path.join(projectRoot, 'assets', 'splash-content.png'),
        ['content.png', 'content@2x.png', 'content@3x.png'],
        ['400x276', '800x552', 'copy']
      );

      // 4. Ensure background color set exists
      ensureColorset(path.join(xcassets, 'SplashScreenBackground.colorset'));

      console.log('[with-splash-cover] Wrote two-layer SplashScreen (bg fill + centered content)');
      return cfg;
    },
  ]);
};
