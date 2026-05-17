# Android admin app — physical device (debug)

The debug APK defaults to **`http://10.0.2.2:3000/`**, which only works on the **Android emulator**. A real phone or tablet cannot reach that address.

## Quick fix checklist

1. **Find your PC’s LAN IP** (same Wi‑Fi as the device):

   ```powershell
   ipconfig
   ```

   Use the **IPv4 Address** for Wi‑Fi (example: `192.168.1.42`).

2. **Edit** [`android/local.properties`](../android/local.properties) (create from [`local.properties.example`](../android/local.properties.example) if missing):

   ```properties
   sdk.dir=C\:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
   ngaDebugApiUrl=http://192.168.1.42:3000
   ```

   - No trailing slash on the URL.
   - To hit **production** instead of local dev: `ngaDebugApiUrl=https://www.rentnextgearauto.com` (**include `www`** — the bare domain redirects POST and causes HTTP 400)

3. **Android Studio:** click the **Gradle elephant** (Sync Project with Gradle Files) → **Build → Rebuild Project** → Run on the device.

4. **Confirm on the login screen:** debug builds show `API: http://192.168.x.x:3000/`. If you still see `10.0.2.2`, sync and rebuild did not pick up `local.properties`.

5. **Start the web app** (local dev only), from the repo root:

   ```powershell
   npm run dev:lan
   ```

   `dev:lan` listens on all interfaces so your tablet can connect. Allow **Node.js / port 3000** through Windows Firewall on private networks.

## Build log

After sync, the Gradle build prints:

```text
NGA Admin debug API_BASE_URL = http://192.168.1.42:3000/
```

If that line still shows `10.0.2.2`, `ngaDebugApiUrl` is not set in `local.properties`.

## Emulator vs device

| Target | `ngaDebugApiUrl` | Dev server |
|--------|------------------|------------|
| Emulator | omit (default `10.0.2.2`) | `npm run dev` |
| Physical device | your PC LAN IP | `npm run dev:lan` |
| Physical device (staging/prod) | `https://your-domain.com` | deployed site |

## Related

- [`android/README.md`](../android/README.md) — project overview
- [`docs/mobile-api.md`](mobile-api.md) — API contract
