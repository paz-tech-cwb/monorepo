#!/usr/bin/env bash
# setup_xcode.sh — Bootstrap the PazChurch iOS Xcode project (SPM, no CocoaPods).
#
# Run once after cloning:
#   cd ios
#   bash setup_xcode.sh
#
# Prerequisites:
#   brew install xcodegen
#   Xcode 15+ installed
#
# Dependencies are managed via Swift Package Manager — no pod install needed.

set -euo pipefail
cd "$(dirname "$0")"

# ── 1. Check for xcodegen ────────────────────────────────────────────────────
if ! command -v xcodegen &>/dev/null; then
  echo "⚠️  xcodegen not found. Install it:"
  echo "    brew install xcodegen"
  exit 1
fi

# ── 2. Build KMP XCFramework if not already present ─────────────────────────
XCFRAMEWORK="../shared/build/XCFrameworks/debug/Shared.xcframework"
if [ ! -d "$XCFRAMEWORK" ]; then
  echo "📦 Building KMP shared framework..."
  (cd .. && ./gradlew :shared:assembleSharedXCFramework)
  echo "✅ Shared.xcframework built"
else
  echo "✅ Shared.xcframework already present"
fi

# ── 3. Generate .xcodeproj ───────────────────────────────────────────────────
xcodegen generate --spec project.yml
echo "✅ PazChurch.xcodeproj generated"

echo ""
echo "═══════════════════════════════════════════════════"
echo " Setup complete!"
echo ""
echo " SPM packages (resolved on first Xcode build):"
echo "   • firebase/firebase-ios-sdk >= 10.0.0"
echo "     - FirebaseAuth"
echo "     - FirebaseMessaging"
echo "   • google/GoogleSignIn-iOS >= 7.0.0"
echo "     - GoogleSignIn"
echo ""
echo " Next steps:"
echo "  1. Set DEVELOPMENT_TEAM in project.yml (your Apple Team ID)"
echo "  2. Copy GoogleService-Info.plist → ios/PazChurch/"
echo "  3. open PazChurch.xcodeproj"
echo "  4. Xcode will resolve SPM packages automatically on first build"
echo "  5. Cmd+B to build"
echo "═══════════════════════════════════════════════════"
