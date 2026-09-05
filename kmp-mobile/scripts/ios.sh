#!/usr/bin/env bash
set -e

echo "▶ Building shared XCFramework..."
./gradlew :shared:assembleSharedXCFramework

echo "▶ Resolving simulator..."
BOOTED=$(xcrun simctl list devices booted --json | python3 -c "
import sys, json
d = json.load(sys.stdin)['devices']
ids = [v[0]['udid'] for k, v in d.items() if 'iOS' in k and v]
print(ids[0] if ids else '')
" 2>/dev/null)

if [ -z "$BOOTED" ]; then
  UDID=$(xcrun simctl list devices available --json | python3 -c "
import sys, json
d = json.load(sys.stdin)['devices']
pairs = [(k, v[0]) for k, v in d.items() if 'iOS' in k and v]
pairs.sort(reverse=True)
print(pairs[0][1]['udid'] if pairs else '')
" 2>/dev/null)
  echo "▶ Booting simulator $UDID..."
  xcrun simctl boot "$UDID"
  open -a Simulator
  BOOTED="$UDID"
fi

echo "▶ Using simulator: $BOOTED"

DERIVED_DATA="$(pwd)/build/ios-derived"

echo "▶ Cleaning..."
xcodebuild clean \
  -project ios/PazChurch.xcodeproj \
  -scheme PazChurch \
  -destination "id=$BOOTED" \
  -derivedDataPath "$DERIVED_DATA" \
  | xcpretty 2>/dev/null || cat

echo "▶ Building..."
xcodebuild build \
  -project ios/PazChurch.xcodeproj \
  -scheme PazChurch \
  -destination "id=$BOOTED" \
  -derivedDataPath "$DERIVED_DATA" \
  | xcpretty 2>/dev/null || cat

APP_PATH=$(find "$DERIVED_DATA/Build/Products" -name "PazChurch.app" | head -1)
echo "▶ Installing $APP_PATH..."
xcrun simctl install "$BOOTED" "$APP_PATH"

echo "▶ Launching..."
xcrun simctl launch "$BOOTED" com.cwb.pazchurch.app

open -a Simulator
