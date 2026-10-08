# MedAnon V2 2.0.2 — PDF export

Android uses ACTION_CREATE_DOCUMENT to choose a destination and write the actual
PDF bytes. The success message appears only after writing and closing the file.
Closing the picker returns cancellation. No broad storage permission is required.
On iOS, a cache file is delivered through the native share sheet. Browser builds
retain jsPDF download. Processing and redaction run locally.

Text copying now uses the reviewed word geometry, including repeated values and
manual zones. Lab headers support uppercase surname/comma names, street addresses
and dotted administrative IDs. Detection remains heuristic: inspect every page
before export; the application does not certify complete anonymisation.

## Build

Run `bash scripts/build-mobile.sh android V2` with Node 20/Yarn, Java 17 and the
Android SDK. Use `ios V2` on macOS with Xcode for an unsigned iPhone archive.
Android output is `dist/MedAnon-V2-debug.apk`; source is `dist/MedAnon-V2-source.zip`.
Run `node --test frontend/tests/*.mjs` for the export, text redaction and OCR tests.

The V2 application ID is `ch.medanon.local.v2`; V1 uses a separate identifier.
CI debug APK signatures differ between runners. If Android rejects an update,
remove the previous V2 after keeping any required exported documents, then install.

Validation: automated tests cover picker success/cancellation, binary PDF data,
sharing and write failure, browser delivery, repeated/manual text redaction and
fictional laboratory headers. The Android build verifies Java compilation and
bundled asset paths. An actual on-device export remains necessary for end-to-end
confirmation.
