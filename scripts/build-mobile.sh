#!/usr/bin/env bash
# Run from the repository root. Requires Node/Yarn; Java/Android SDK for Android,
# macOS/Xcode/CocoaPods for iOS. Does not change Git branches or publish anything.
set -euo pipefail
platform="${1:?Usage: scripts/build-mobile.sh android|ios}"
case "$platform" in android|ios) ;; *) exit 2;; esac
variant="${2:-V2}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd frontend
corepack enable
yarn install --network-timeout 600000
yarn add @capacitor/core@6 "@capacitor/$platform@6" @capacitor/filesystem@6 @capacitor/share@6
yarn add -D @capacitor/cli@6
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
PUBLIC_URL=./ CI=false DISABLE_EMERGENT_OVERLAY=true ENABLE_HEALTH_CHECK=false yarn build
python3 "$script_dir/check-mobile-assets.py" build
if [ "$variant" = V2 ]; then node --test tests/*.mjs; fi
if [ ! -d "$platform" ]; then npx cap add "$platform"; fi
npx cap sync "$platform"
mkdir -p ../dist
if [ "$platform" = android ]; then
  (cd android && chmod +x gradlew && ./gradlew assembleDebug --no-daemon)
  cp android/app/build/outputs/apk/debug/app-debug.apk ../dist/MedAnon-${variant}-debug.apk
  if [ "$variant" = V2 ]; then
    (cd .. && git archive --format=zip --output=dist/MedAnon-V2-source.zip HEAD)
  fi
else
  /usr/libexec/PlistBuddy -c 'Add :NSCameraUsageDescription string Photograph a document for local processing' ios/App/App/Info.plist || true
  xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release \
    -sdk iphoneos -archivePath ../dist/MedAnon-${variant}-unsigned.xcarchive \
    archive CODE_SIGNING_ALLOWED=NO
  # This archive is NOT an installable IPA: Apple signing is required.
  ditto -c -k --keepParent ../dist/MedAnon-${variant}-unsigned.xcarchive ../dist/MedAnon-${variant}-unsigned.xcarchive.zip
fi
