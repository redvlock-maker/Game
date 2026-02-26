# Aether Mobile — APK Build Guide

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm / yarn | Latest |
| EAS CLI | `npm install -g eas-cli` |
| Expo account | Free at expo.dev |
| Android Studio (optional) | For local builds |

---

## Option A — EAS Cloud Build (Recommended)

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo
eas login

# 3. Link project (run once)
eas init --id <your-expo-project-id>

# 4. Build the APK
cd aether-mobile
eas build --platform android --profile android-apk

# 5. Download the APK from the EAS dashboard link in terminal output
```

---

## Option B — Local Build (No EAS Account)

```bash
# 1. Pre-requisites: Java 17 + Android SDK installed
# Set ANDROID_HOME and JAVA_HOME env vars

# 2. Generate native Android project
npx expo prebuild --platform android

# 3. Build debug APK
cd android
./gradlew assembleDebug

# APK output: android/app/build/outputs/apk/debug/app-debug.apk

# 4. Build release APK (requires signing keystore)
./gradlew assembleRelease
```

---

## Installing the APK on Android

```bash
# Via ADB
adb install app-debug.apk

# Or: copy to device → Files app → tap the .apk → "Install"
# Enable "Install unknown apps" in Android Settings → Security if prompted
```

---

## Vault Location

Notes are stored at:
```
/data/data/com.aether.mobile/files/AetherVault/
```

To browse files externally, use the **Export Vault** button (Archive icon) in the app header.

---

## Build Profiles

| Profile | Output | Use case |
|---------|--------|----------|
| `development` | Debug APK | Dev/testing with Expo DevClient |
| `android-apk` | Release APK | Sideloading on devices |
| `production` | AAB bundle | Google Play Store submission |
