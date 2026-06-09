/**
 * Google Apps Script — Turo Email → NextGearAuto Webhook Forwarder
 *
 * SETUP:
 * 1. Go to https://script.google.com and open your project
 * 2. Select ALL text in Code.gs, delete it, paste ONLY this file (nothing extra below)
 * 3. Update WEBHOOK_SECRET below
 * 4. Run setup() once, then processNewTuroEmails() to test
 *
 * ONE-TIME BACKFILL (run in this order — use the function dropdown + Run):
 *   1. runBookingBackfill365        — imports bookings / upcoming trips (skips cancellations)
 *   2. runCancellationBackfill365   — marks cancellations on trips that exist in the calendar
 */

// ═══════ CONFIGURATION — EDIT THESE ═══════

var WEBHOOK_URL = "https://www.rentnextgearauto.com/api/webhooks/turo-email";
var WEBHOOK_SECRET = "PASTE_YOUR_SECRET_HERE"; // Must match TURO_WEBHOOK_SECRET in Vercel (Production)

var TURO_SEARCH_QUERY = "from:turo.com newer_than:365d";
var PROCESSED_KEY_PREFIX = "turo_processed_";
var PROCESSED_RETENTION_DAYS = 365;
var SEARCH_BATCH_SIZE = 100;
var MAX_SEARCH_THREADS = 1200;

// ═══════ MAIN FUNCTION ═══════

function processNewTuroEmails() {
  var threads = searchThreads(TURO_SEARCH_QUERY, MAX_SEARCH_THREADS);
  pruneProcessedKeys(PROCESSED_RETENTION_DAYS);

  if (threads.length === 0) {
    Logger.log("No new Turo emails found.");
    return;
  }

  Logger.log("Found " + threads.length + " new Turo email thread(s).");

  for (var t = 0; t < threads.length; t++) {
    var thread = threads[t];
    var messages = thread.getMessages();

    for (var m = 0; m < messages.length; m++) {
      var message = messages[m];
      var messageId = message.getId();
      if (isProcessedMessage(messageId)) continue;

      var subject = message.getSubject();
      var body = message.getPlainBody() || message.getBody();
      var from = message.getFrom();

      if (!from || from.toLowerCase().indexOf("turo") === -1) {
        continue;
      }

      if (!isRelevantTuroEmail(subject, body)) {
        markProcessedMessage(messageId);
        Logger.log("SKIP (not a booking email): " + subject);
        continue;
      }

      Logger.log("Processing: " + subject);

      try {
        var response = UrlFetchApp.fetch(WEBHOOK_URL, {
          method: "post",
          contentType: "application/json",
          headers: {
            Authorization: "Bearer " + WEBHOOK_SECRET
          },
          payload: JSON.stringify({
            emailText: body,
            subject: subject,
            from: from,
            date: message.getDate().toISOString()
          }),
          muteHttpExceptions: true
        });

        var code = response.getResponseCode();
        var result = response.getContentText();

        if (code === 201) {
          Logger.log("SUCCESS — Blocked dates created: " + result);
          markProcessedMessage(messageId);
          if (message.isUnread()) message.markRead();
        } else if (code === 200) {
          logWebhookSuccess(result);
          markProcessedMessage(messageId);
          if (message.isUnread()) message.markRead();
        } else {
          Logger.log("RESPONSE " + code + ": " + result);
        }
      } catch (err) {
        Logger.log("ERROR sending to webhook: " + err.toString());
        continue;
      }
    }
  }

  Logger.log("Done processing Turo emails.");
}

// ═══════ SETUP & TEARDOWN ═══════

function setup() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "processNewTuroEmails") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("processNewTuroEmails")
    .timeBased()
    .everyMinutes(15)
    .create();

  Logger.log("Timer set: processNewTuroEmails will run every 15 minutes.");
  Logger.log("Setup complete! You can also run processNewTuroEmails manually to test.");
}

function teardown() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "processNewTuroEmails") {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  Logger.log("Removed " + removed + " trigger(s). Auto-checking is now disabled.");
}

/** One-click runner for Apps Script toolbar (no parameters needed). */
function runBookingBackfill365() {
  backfillRecentTuroEmails(365);
}

/** One-click runner for Apps Script toolbar (no parameters needed). */
function runCancellationBackfill365() {
  backfillCancellationEmails(365);
}

function backfillRecentTuroEmails(days) {
  var safeDays = Math.max(1, Math.min(Number(days) || 30, 365));
  var query = "from:turo.com newer_than:" + safeDays + "d";
  var threads = searchThreads(query, MAX_SEARCH_THREADS);
  Logger.log("Booking backfill threads: " + threads.length + " (newer_than " + safeDays + "d)");

  var sent = 0;
  var skipped = 0;

  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();
    for (var m = 0; m < messages.length; m++) {
      var message = messages[m];
      var from = message.getFrom();
      if (!from || from.toLowerCase().indexOf("turo") === -1) continue;

      var subject = message.getSubject();
      var body = message.getPlainBody() || message.getBody();

      if (isCancellationEmail(subject, body)) {
        skipped++;
        continue;
      }
      if (!isRelevantTuroEmail(subject, body)) {
        skipped++;
        continue;
      }

      try {
        var response = UrlFetchApp.fetch(WEBHOOK_URL, {
          method: "post",
          contentType: "application/json",
          headers: { Authorization: "Bearer " + WEBHOOK_SECRET },
          payload: JSON.stringify({
            emailText: body,
            subject: subject,
            from: from,
            date: message.getDate().toISOString()
          }),
          muteHttpExceptions: true
        });
        sent++;
        Logger.log("BOOKING BACKFILL " + response.getResponseCode() + " — " + subject);
      } catch (err) {
        Logger.log("BOOKING BACKFILL ERROR: " + err.toString());
      }
    }
  }

  Logger.log("Booking backfill done. Sent: " + sent + ", skipped: " + skipped);
}

function backfillCancellationEmails(days) {
  var safeDays = Math.max(1, Math.min(Number(days) || 365, 365));
  var query =
    'from:turo.com (cancel OR cancelled OR canceled OR "you\'ve cancelled" OR "you\'ve canceled") newer_than:' +
    safeDays +
    "d";
  var threads = searchThreads(query, MAX_SEARCH_THREADS);
  Logger.log("Cancellation backfill threads: " + threads.length + " (newer_than " + safeDays + "d)");

  var sent = 0;
  var skipped = 0;

  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();
    for (var m = 0; m < messages.length; m++) {
      var message = messages[m];
      var from = message.getFrom();
      if (!from || from.toLowerCase().indexOf("turo") === -1) continue;

      var subject = message.getSubject();
      var body = message.getPlainBody() || message.getBody();

      if (!isCancellationEmail(subject, body)) {
        skipped++;
        continue;
      }

      try {
        var response = UrlFetchApp.fetch(WEBHOOK_URL, {
          method: "post",
          contentType: "application/json",
          headers: { Authorization: "Bearer " + WEBHOOK_SECRET },
          payload: JSON.stringify({
            emailText: body,
            subject: subject,
            from: from,
            date: message.getDate().toISOString()
          }),
          muteHttpExceptions: true
        });
        sent++;
        Logger.log("CANCEL BACKFILL " + response.getResponseCode() + " — " + subject);
      } catch (err) {
        Logger.log("CANCEL BACKFILL ERROR: " + err.toString());
      }
    }
  }

  Logger.log("Cancellation backfill done. Sent: " + sent + ", skipped: " + skipped);
}

// ═══════ HELPERS ═══════

function logWebhookSuccess(result) {
  try {
    var parsed = JSON.parse(result);
    if (parsed.action === "cancelled") {
      Logger.log("CANCELLED — Trip marked cancelled: " + result);
    } else if (parsed.action === "extended") {
      Logger.log("EXTENDED — Trip extended: " + result);
    } else if (parsed.action === "merged_refresh" || parsed.action === "merged_widened") {
      Logger.log("REFRESHED — Turo block updated: " + result);
    } else {
      Logger.log("OK — " + (parsed.action || "handled") + ": " + result);
    }
  } catch (e) {
    Logger.log("OK — handled: " + result);
  }
}

function isCancellationEmail(subject, body) {
  var s = String(subject || "").toLowerCase();
  var b = String(body || "").toLowerCase();
  return (
    /cancelled|canceled/.test(s) ||
    /you.?ve\s+cancel/.test(s) ||
    /has\s+cancel(?:led|ed)/.test(s) ||
    /trip\s+has\s+been\s+cancel/.test(b)
  );
}

function isRelevantTuroEmail(subject, body) {
  var s = String(subject || "").toLowerCase();
  var b = String(body || "").toLowerCase();

  if (/earnings are on the way|security code|confirmation code|reset your password|password reset|rated their trip|sent you a message|reimbursement|protection plan|unlisted due to|congratulations on listing|virtual orientation|buckle up|payout update|ineligible incidental|action required for your vehicle|still need to confirm|added another driver|disputed your|been charged for your|not responded to your|updates to your protection|attend a virtual orientation/i.test(s)) {
    return false;
  }

  if (/booked|cancelled|canceled|extension|extended|change request|confirmed.*trip|new trip|upcoming trip|has changed their trip|you.?ve cancelled|you.?ve confirmed/i.test(s)) {
    return true;
  }

  return /trip\s+start/i.test(b) && /trip\s+end/i.test(b);
}

function processedKey(messageId) {
  return PROCESSED_KEY_PREFIX + String(messageId || "");
}

function isProcessedMessage(messageId) {
  if (!messageId) return false;
  var value = PropertiesService.getScriptProperties().getProperty(processedKey(messageId));
  return Boolean(value);
}

function markProcessedMessage(messageId) {
  if (!messageId) return;
  PropertiesService.getScriptProperties().setProperty(
    processedKey(messageId),
    String(Date.now())
  );
}

function pruneProcessedKeys(retentionDays) {
  var safeDays = Math.max(1, Math.min(Number(retentionDays) || 365, 3650));
  var cutoffMs = Date.now() - safeDays * 24 * 60 * 60 * 1000;
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var toDelete = [];

  for (var key in all) {
    if (all.hasOwnProperty(key) && key.indexOf(PROCESSED_KEY_PREFIX) === 0) {
      var ts = Number(all[key]);
      if (!isFinite(ts) || ts < cutoffMs) {
        toDelete.push(key);
      }
    }
  }

  for (var i = 0; i < toDelete.length; i++) {
    props.deleteProperty(toDelete[i]);
  }
  if (toDelete.length > 0) {
    Logger.log("Pruned processed message keys: " + toDelete.length);
  }
}

function searchThreads(query, maxThreads) {
  var safeMax = Math.max(1, Math.min(Number(maxThreads) || 200, 5000));
  var allThreads = [];
  var offset = 0;

  while (allThreads.length < safeMax) {
    var remaining = safeMax - allThreads.length;
    var limit = Math.min(SEARCH_BATCH_SIZE, remaining);
    var batch = GmailApp.search(query, offset, limit);
    if (!batch || batch.length === 0) break;
    for (var i = 0; i < batch.length; i++) {
      allThreads.push(batch[i]);
    }
    if (batch.length < limit) break;
    offset += batch.length;
  }

  return allThreads;
}

// END OF FILE — do not paste or type anything below this line in Code.gs
