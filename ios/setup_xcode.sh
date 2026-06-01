#!/usr/bin/env bash
# setup_xcode.sh — Bootstrap the PazChurch iOS Xcode project.
#
# Run once after cloning:
#   cd ios
#   bash setup_xcode.sh
#
# Prerequisites:
#   brew install xcodegen
#   Xcode 15+ installed
#
# What this does:
#   1. Writes project.yml for XcodeGen
#   2. Runs xcodegen to produce PazChurch.xcodeproj
#   3. Optionally runs pod install if CocoaPods is available

set -euo pipefail
cd "$(dirname "$0")"

# ── 1. Write project.yml ─────────────────────────────────────────────────────
cat > project.yml << 'YAML'
name: PazChurch
options:
  bundleIdPrefix: br.church.paz
  deploymentTarget:
    iOS: "16.0"
  xcodeVersion: "15.0"
  generateEmptyDirectories: true

settings:
  base:
    SWIFT_VERSION: "5.9"
    IPHONEOS_DEPLOYMENT_TARGET: "16.0"
    TARGETED_DEVICE_FAMILY: "1,2"
    DEVELOPMENT_TEAM: ""          # Set to your Apple Developer Team ID
    CODE_SIGN_STYLE: Automatic

targets:
  PazChurch:
    type: application
    platform: iOS
    sources:
      - path: PazChurch
        excludes:
          - "**/*.md"
    dependencies:
      # KMP shared framework (built by ./gradlew :shared:assembleXCFramework)
      - framework: ../build/XCFrameworks/debug/Shared.xcframework
        embed: true
      # Firebase (via CocoaPods - see Podfile)
      - sdk: FirebaseCore.framework
        embed: false
      - sdk: FirebaseMessaging.framework
        embed: false
    settings:
      base:
        INFOPLIST_FILE: PazChurch/Info.plist
        PRODUCT_BUNDLE_IDENTIFIER: com.cwb.pazchurch.app
        ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon
        # Google Sign-In callback URL scheme from GoogleService-Info.plist REVERSED_CLIENT_ID
        GOOGLE_REVERSED_CLIENT_ID: com.googleusercontent.apps.139667803306-vbo7nbgufjpr464k2ko91gnbvodjo9v7
    capabilities:
      - pushNotifications
      - signInWithApple
    prebuildScripts:
      - name: Build KMP Shared Framework
        script: |
          cd "$SRCROOT/.."
          ./gradlew :shared:assembleXCFramework --configuration debug
        basedOnDependencyAnalysis: false

YAML

echo "✅ project.yml written"

# ── 2. Check for xcodegen ────────────────────────────────────────────────────
if ! command -v xcodegen &>/dev/null; then
  echo "⚠️  xcodegen not found. Install it:"
  echo "    brew install xcodegen"
  echo "Then re-run this script."
  exit 1
fi

# ── 3. Generate .xcodeproj ───────────────────────────────────────────────────
xcodegen generate --spec project.yml
echo "✅ PazChurch.xcodeproj generated"

# ── 4. Create Info.plist if missing ─────────────────────────────────────────
PLIST="PazChurch/Info.plist"
if [ ! -f "$PLIST" ]; then
  mkdir -p PazChurch
  cat > "$PLIST" << 'XML'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>NSCameraUsageDescription</key>
    <string>Câmera necessária para foto de perfil</string>
    <key>UIApplicationSceneManifest</key>
    <dict>
        <key>UIApplicationSupportsMultipleScenes</key>
        <false/>
    </dict>
    <key>UILaunchScreen</key>
    <dict/>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
    </array>
    <key>UIUserInterfaceStyle</key>
    <string>Automatic</string>
</dict>
</plist>
XML
  echo "✅ Info.plist created"
fi

# ── 5. Create Podfile if CocoaPods is available ──────────────────────────────
if command -v pod &>/dev/null; then
  if [ ! -f "Podfile" ]; then
    cat > Podfile << 'PODFILE'
platform :ios, '16.0'
use_frameworks!

target 'PazChurch' do
  # Firebase
  pod 'FirebaseCore',      '~> 10.0'
  pod 'FirebaseAuth',      '~> 10.0'
  pod 'FirebaseMessaging', '~> 10.0'

  # Google Sign-In
  pod 'GoogleSignIn', '~> 7.0'
end
PODFILE
    echo "✅ Podfile written"
  fi

  echo "📦 Running pod install..."
  pod install
  echo "✅ CocoaPods installed — open PazChurch.xcworkspace (not .xcodeproj)"
else
  echo "ℹ️  CocoaPods not found — skipping pod install."
  echo "   Install: sudo gem install cocoapods"
  echo "   Then run: pod install"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo " Setup complete!"
echo ""
echo " Next steps:"
echo "  1. Set DEVELOPMENT_TEAM in project.yml"
echo "  2. Copy GoogleService-Info.plist into ios/PazChurch/"
echo "  3. Build KMP framework:"
echo "     cd .. && ./gradlew :shared:assembleXCFramework"
echo "  4. Open in Xcode:"
echo "     open PazChurch.xcworkspace  (if using CocoaPods)"
echo "     open PazChurch.xcodeproj    (otherwise)"
echo "  5. Cmd+B to build"
echo "═══════════════════════════════════════════════════"
