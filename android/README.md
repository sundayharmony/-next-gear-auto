# NGA Admin (Android)

Kotlin + Jetpack Compose client for staff/admin. API contracts: [`docs/mobile-api.md`](../docs/mobile-api.md).

## What works today

- **Login** (`POST /api/auth` with `client: native`) → stores **access + refresh** JWTs, **role**, and **access expiry** in **EncryptedSharedPreferences**.
- **Automated API calls** send `Authorization: Bearer <access_token>` (CSRF not required).
- **401 handling**: **`TokenRefreshInterceptor`** refreshes via **`POST /api/auth/refresh`** (plain OkHttp), saves tokens (+ expiry), retries once.
- **Proactive refresh**: **`ProactiveRefreshInterceptor`** refreshes ~**2 minutes** before access JWT expiry.
- **Today** tab: overdue actives, pickup/return today, multi-day rentals overlapping today (parallel API calls).
- **Bookings** tab: paginated list; tap a row → **booking detail**.
- **Booking detail**: full summary; **payment list + record payment** for **admin** accounts (`/api/admin/booking-payments`).
- **Payments** tab: overview copy (per-booking payments live on detail).

## Project Structure

The codebase is organized by technical layer and feature:

- **`api/`**: Retrofit service definitions and data models.
- **`network/`**: OkHttp interceptors for auth, token refresh, and proactive refresh logic.
- **`ui/`**: Feature-based Compose screens (Auth, Today, Bookings, Booking Detail).
- **`navigation/`**: Typed routes and the application's navigation graph.
- **`domain/`**: Shared business logic (e.g., booking status lifecycles).
- **`TokenStore.kt`**: Secure storage for JWTs using `EncryptedSharedPreferences`.

## Requirements

- **JDK 17** (`JAVA_HOME` set — required for Gradle).
- Android Studio with **Android SDK 35**.
- Next.js site running for emulator testing (see below).

## Base URL (debug vs release)

- **Debug** builds use `BuildConfig.API_BASE_URL = http://10.0.2.2:3000/` (Android emulator → host machine port 3000). Run `npm run dev` in the web repo on the host.
- **Release** base URL: set Gradle property **`ngaReleaseApiUrl`** (see [`gradle.properties`](gradle.properties)), or it falls back to `https://YOUR_PRODUCTION_DOMAIN/`.

Physical device: use your PC’s LAN IP instead of `10.0.2.2`, add that host under cleartext/XML network config if you use HTTP, or serve HTTPS.

## Open in Android Studio

1. **File → Open** → this `android` folder.
2. Gradle sync; install missing SDKs if prompted.
3. Create **`local.properties`** if Android Studio does not:

```properties
sdk.dir=C\:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
```

4. Run **app** on an emulator or device.

## Command line

```bat
gradlew.bat :app:assembleDebug
```

Requires `JAVA_HOME` pointing at a JDK 17 install.

## Next steps

- Status actions on booking detail (PATCH `/api/bookings`), calendar sync, document camera capture + `/api/bookings/upload`.
- Optional: Firebase Crashlytics, certificate pinning, offline cache.
