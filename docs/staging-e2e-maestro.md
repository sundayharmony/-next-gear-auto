# Staging E2E (Maestro) — NGA Admin Android

1. Install [Maestro](https://maestro.mobile.dev/) and a staging APK that points `API_BASE_URL` at your staging host (`ngaReleaseApiUrl` Gradle property or `BuildConfig` override).
2. Connect a device or start an emulator with the app installed.
3. From the repo root:

```bash
maestro test maestro/flows/nga-staging-login.yaml
```

Extend flows under `maestro/flows/` for login → bookings list → open detail. Keep credentials out of git (use Maestro secrets or local-only YAML).
