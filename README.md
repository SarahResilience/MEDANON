# MEDANON — MedAnon Local

**MedAnon Local** is a privacy-first prototype for healthcare professionals to anonymize medical documents before using them with an authorized AI tool.

## What it does

- Import a PDF or image, or take a photo on Android.
- Render/OCR the document locally.
- Detect likely PII/PHI using local rules and heuristics.
- Let the clinician validate, reject, or add redaction zones.
- Export a flattened anonymized PDF or copy anonymized text.
- Keep the Android app offline: the manifest deliberately declares **no INTERNET permission**.

> Automatic detection is an aid, not a guarantee. A human page-by-page review remains mandatory.

## Repository layout

- `frontend/` — React UI and local OCR/anonymization logic.
- `android/` — native Android WebView wrapper with camera/file chooser and secure PDF export bridge.
- `backend/` — original optional prototype backend; it is not required for document anonymization.
- `.github/workflows/build-android-apk.yml` — CI build that produces an installable debug APK.

## Build the APK on GitHub

The workflow runs on pushes to `main` and `chatgpt/android-apk`, and can also be started manually from **Actions → Build Android APK → Run workflow**.

When it succeeds, download the artifact named **MedAnon-Local-APK**. It contains `MedAnon-Local-debug.apk`.

## Local web build

```bash
cd frontend
npm install --legacy-peer-deps
bash scripts/fetch-tessdata.sh
npm run build
```

The OCR engine, PDF.js worker, and French/English OCR data are bundled into the production build.

## Privacy design

The Android wrapper uses `https://appassets.androidplatform.net` to serve bundled assets inside WebView, declares no Internet permission, disables cleartext traffic, and exports a newly rasterized PDF. The source document is not uploaded to a backend by this application.

For clinical use, the organization must still perform its own security/privacy validation, software approval, and legal/compliance review.
