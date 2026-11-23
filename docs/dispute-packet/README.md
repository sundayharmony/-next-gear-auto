# Ticket Dispute Packet: system changes and operations

Research date: 2026-11-22. See `nj-legal-research.md` (legal, by ticket category) and `hudson-municipal-guide.md` (12 Hudson County towns). Both flag what is UNVERIFIED. Not legal advice.

## What was added
- **Button**: "Download Dispute Packet" panel on each ticket (`src/app/admin/tickets/ticket-dispute-panel.tsx`, mounted in `ticket-detail-panel.tsx`). Shows the checklist (included / upload needed / missing), upload buttons, municipality guidance, loading/error/success states, and blocks double clicks.
- **API** (staff only, `verifyAdminOrManager`):
  - `GET /api/admin/tickets/dispute-packet?id=` streams one PDF, `NextGearAuto_DisputePacket_<ticket#>.pdf`; `&mode=summary` returns the checklist and guidance as JSON.
  - `GET/POST/DELETE /api/admin/tickets/evidence` manage uploaded citation, registration and other evidence (PDF/JPG/PNG, 10 MB).
- **Code**: `src/lib/disputes/packet-data.ts` (gathers records, builds the checklist), `packet-pdf.ts` (US Letter PDF; originals merged unmodified), `municipal-guidance.ts` + `municipal-requirements.json` (editable per-town config).
- **Database** (`supabase-ticket-evidence.sql`, applied; reversible): table `ticket_evidence_documents` (RLS on, no policies, service role only) and a PRIVATE storage bucket `ticket-evidence`. No existing table or row was changed.

## Packet contents
A cover and contents; B renter identification and ID photos; C signed agreement pages copied as stored (not recreated or stamped); D citation; E vehicle registration; F rental verification, including a warning if the violation date is outside the rental; G insurance proof and other evidence; H checklist, municipality guidance and the "evidence compilation, not an official filing" statement. Missing items are marked MISSING / NOT ON FILE; nothing is invented.

## Security
Packets are generated per request and streamed with `no-store`. No packet is stored and no public URL is created. New evidence lives in a private bucket. Existing `booking-documents` bucket settings were not changed; rental agreements and customer IDs are only read.

## Limits
- Merged original pages carry no page number (stamping would modify them); the cover lists page ranges.
- WebP/HEIC images can't be embedded; they're listed for manual add.
- The system stores no check-out/return photos; upload them as supporting evidence.
- Nothing is auto-submitted. Official court forms and notarization are not produced.

## When a ticket arrives
1. Add it with the municipality, violation date, ticket number and link its booking.
2. Upload the citation scan/photo; upload the vehicle registration once per vehicle.
3. Confirm the renter's address and license on the booking (license reader).
4. Download the packet, review the checklist page, and call the town's municipal court clerk to confirm the form, notarization and deadline (see the Hudson guide).
5. Have the lessor statement notarized if the court requires it, and send it before the court or pay-by date. Late fines accrue.

## Outstanding
Court-prescribed lessor form not located; most municipal contacts and deadlines unverified; moving-violation handling needs the court or an attorney; red-light cameras expired in 2014 and NJ speed cameras remain barred as of the research date (S3218 only introduced). Not browser-tested on mobile or against live data; see the PR notes.
