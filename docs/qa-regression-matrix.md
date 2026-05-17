# QA regression matrix (staff / NGA Admin)

Run **full** matrix before major releases; **smoke** (bold rows) weekly on staging.

| Area | Case | Admin | Manager | Notes |
|------|------|:-----:|:-------:|-------|
| **Auth** | Cold start logged in | ✓ | ✓ | |
| **Auth** | Token expiry mid-session / refresh | ✓ | ✓ | |
| **Auth** | Logout clears tokens | ✓ | ✓ | |
| Bookings | List load / pagination | ✓ | ✓ | Manager scope per API |
| Bookings | Search / filters | ✓ | partial | |
| **Bookings** | Status transitions match web rules | ✓ | ✓ | incl. agreement before confirm |
| Bookings | Cancel + blocked dates cleanup | ✓ | | |
| **Payments** | List + record payment | ✓ | — | Admin-only API |
| **Documents** | ID + insurance upload limits | ✓ | ✓ | 5MB, MIME whitelist |
| Calendar / week | Sections by pickup date | ✓ | ✓ | |
| Roles | Manager cannot hit admin-only routes | — | ✓ | Expect 403 |

Record pass/fail and build ID in your external QA tracker.
