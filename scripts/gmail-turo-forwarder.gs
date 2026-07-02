/**
 * Google Apps Script — Turo Email quota-safe sync runner.
 *
 * SINGLE AUTO RUNNER:
 * - runTuroSync(): incremental ingest + cancellation handling + accuracy refresh checks.
 * - setup(): installs 15-min sync trigger + daily maintenance trigger.
 */

// ═══════ CONFIGURATION — EDIT THESE ═══════
var WEBHOOK_URL = "https://www.rentnextgearauto.com/api/webhooks/turo-email";
var WEBHOOK_SECRET = "PASTE_YOUR_SECRET_HERE"; // Must match TURO_WEBHOOK_SECRET in Vercel

var TURO_FROM_QUERY = "from:turo.com";
var SEARCH_BATCH_SIZE = 20;
var MAX_THREADS_PER_RUN = 40;
var MAX_MESSAGES_PER_RUN = 80;
var RECONCILE_MESSAGE_COUNT = 20;
var PROCESSED_RETENTION_DAYS = 365;

var KEY_PREFIX = "turo_sync_";
var PROCESSED_KEY_PREFIX = KEY_PREFIX + "processed_";
var LAST_SYNC_ISO_KEY = KEY_PREFIX + "last_sync_iso";
var RECENT_IDS_KEY = KEY_PREFIX + "recent_message_ids";
var LOCATION_BACKFILL_OFFSET_KEY = KEY_PREFIX + "location_backfill_offset";
var LOCK_KEY = KEY_PREFIX + "lock";
var LOCK_TTL_MS = 10 * 60 * 1000;

// ═══════ MAIN ═══════
function runTuroSync() {
  var lock = tryAcquireLock();
  if (!lock.acquired) {
    Logger.log("SKIP — sync already in progress.");
    return;
  }

  var metrics = {
    scannedThreads: 0,
    scannedMessages: 0,
    processed: 0,
    skipped: 0,
    failed: 0,
    sent: 0,
    reconcileSent: 0,
    quotaGuardTriggered: false,
  };

  try {
    pruneProcessedKeys(PROCESSED_RETENTION_DAYS);
    var lastSyncIso = getScriptProp(LAST_SYNC_ISO_KEY, "");
    var query = buildIncrementalQuery(lastSyncIso);
    var threads = searchThreadsCapped(query, MAX_THREADS_PER_RUN);
    metrics.scannedThreads = threads.length;

    for (var t = 0; t < threads.length; t++) {
      if (metrics.scannedMessages >= MAX_MESSAGES_PER_RUN) {
        metrics.quotaGuardTriggered = true;
        break;
      }

      var messages = threads[t].getMessages();
      for (var m = 0; m < messages.length; m++) {
        if (metrics.scannedMessages >= MAX_MESSAGES_PER_RUN) {
          metrics.quotaGuardTriggered = true;
          break;
        }

        var message = messages[m];
        metrics.scannedMessages++;
        var result = handleMessage(message, "ingest");

        if (result.status === "processed") {
          metrics.processed++;
          metrics.sent++;
        } else if (result.status === "skipped") {
          metrics.skipped++;
        } else {
          metrics.failed++;
        }
      }
    }

    var reconcileResult = runAccuracyReconciliation();
    metrics.reconcileSent = reconcileResult.sent;
    metrics.failed += reconcileResult.failed;

    setScriptProp(LAST_SYNC_ISO_KEY, new Date().toISOString());
    Logger.log("runTuroSync metrics: " + JSON.stringify(metrics));
  } finally {
    releaseLock();
  }
}

// Keep backward compatibility for existing trigger names.
function processNewTuroEmails() {
  runTuroSync();
}

function setup() {
  removeProjectTrigger("runTuroSync");
  removeProjectTrigger("processNewTuroEmails");
  removeProjectTrigger("dailyMaintenance");

  ScriptApp.newTrigger("runTuroSync")
    .timeBased()
    .everyMinutes(15)
    .create();

  ScriptApp.newTrigger("dailyMaintenance")
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();

  Logger.log("Setup complete: runTuroSync every 15 min + dailyMaintenance once/day.");
}

function teardown() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === "runTuroSync" || fn === "processNewTuroEmails" || fn === "dailyMaintenance") {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  Logger.log("Removed " + removed + " trigger(s).");
}

function dailyMaintenance() {
  pruneProcessedKeys(PROCESSED_RETENTION_DAYS);
  trimRecentMessageIds(100);
  Logger.log("dailyMaintenance complete.");
}

// ═══════ MANUAL BACKFILL (chunked) ═══════
function runBookingBackfill30() {
  runChunkedBackfill(30, "booking");
}

function runCancellationBackfill30() {
  runChunkedBackfill(30, "cancellation");
}

/** Re-send booking emails as reconcile_refresh to fill missing pickup locations. */
function runLocationBackfill30() {
  runChunkedBackfill(30, "location");
}

function runLocationBackfill90() {
  runChunkedBackfill(90, "location");
}

function runLocationBackfill180() {
  runChunkedBackfill(180, "location");
}

/** Reset Gmail search offset for location backfill (run before a fresh 180-day pass). */
function resetLocationBackfillOffset() {
  deleteScriptProp(LOCATION_BACKFILL_OFFSET_KEY);
  Logger.log("Location backfill offset reset.");
}

function runChunkedBackfill(days, mode) {
  var safeDays = Math.max(1, Math.min(Number(days) || 30, 365));
  var safeMode = mode === "cancellation" ? "cancellation" : mode === "location" ? "location" : "booking";
  var query = buildBackfillQuery(safeDays, safeMode);
  var offset = safeMode === "location" ? Number(getScriptProp(LOCATION_BACKFILL_OFFSET_KEY, "0")) || 0 : 0;
  var threads = searchThreadsCapped(query, MAX_THREADS_PER_RUN, offset);
  var sent = 0;
  var skipped = 0;

  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();
    for (var m = 0; m < messages.length; m++) {
      if (sent >= MAX_MESSAGES_PER_RUN) break;
      var msg = messages[m];
      var subject = String(msg.getSubject() || "");
      var body = String(msg.getPlainBody() || msg.getBody() || "");
      var eventType = classifyEventType(subject, body);

      if (safeMode === "booking" && eventType === "cancellation") {
        skipped++;
        continue;
      }
      if (safeMode === "cancellation" && eventType !== "cancellation") {
        skipped++;
        continue;
      }
      var sendType = safeMode === "location" ? "reconcile_refresh" : eventType;
      if (safeMode === "location" && eventType === "cancellation") {
        skipped++;
        continue;
      }
      var res = sendToWebhook(msg, sendType, safeMode === "location" ? "location_backfill" : "backfill");
      if (res.ok) sent++;
      else skipped++;
    }
    if (sent >= MAX_MESSAGES_PER_RUN) break;
  }

  if (safeMode === "location") {
    if (threads.length === 0) {
      deleteScriptProp(LOCATION_BACKFILL_OFFSET_KEY);
      Logger.log("Location backfill exhausted query; offset reset.");
    } else {
      setScriptProp(LOCATION_BACKFILL_OFFSET_KEY, String(offset + threads.length));
    }
  }

  Logger.log(
    "Backfill complete mode=" +
      safeMode +
      " days=" +
      safeDays +
      " offset=" +
      offset +
      " sent=" +
      sent +
      " skipped=" +
      skipped
  );
}

// ═══════ CORE PROCESSING ═══════
function handleMessage(message, sourceMode) {
  var messageId = message.getId();
  if (!messageId || isProcessedMessage(messageId)) {
    return { status: "skipped" };
  }

  var from = String(message.getFrom() || "").toLowerCase();
  if (from.indexOf("turo") === -1) {
    markProcessedMessage(messageId);
    return { status: "skipped" };
  }

  var subject = String(message.getSubject() || "");
  var body = String(message.getPlainBody() || message.getBody() || "");
  if (!isRelevantTuroEmail(subject, body)) {
    markProcessedMessage(messageId);
    return { status: "skipped" };
  }

  var eventType = classifyEventType(subject, body);
  var sent = sendToWebhook(message, eventType, sourceMode);
  if (!sent.ok) return { status: "failed" };

  markProcessedMessage(messageId);
  rememberRecentMessageId(messageId);
  if (message.isUnread()) message.markRead();
  return { status: "processed" };
}

function runAccuracyReconciliation() {
  var ids = getRecentMessageIds();
  var sent = 0;
  var failed = 0;
  var max = Math.min(RECONCILE_MESSAGE_COUNT, ids.length);

  for (var i = 0; i < max; i++) {
    var messageId = ids[i];
    try {
      var msg = GmailApp.getMessageById(messageId);
      if (!msg) continue;
      var subject = String(msg.getSubject() || "");
      var body = String(msg.getPlainBody() || msg.getBody() || "");
      if (!needsAccuracyRefresh(subject, body)) continue;

      var result = sendToWebhook(msg, "reconcile_refresh", "reconcile");
      if (result.ok) sent++;
      else failed++;
    } catch (err) {
      failed++;
      Logger.log("Reconcile fetch/send failed for message " + messageId + ": " + err.toString());
    }
  }

  return { sent: sent, failed: failed };
}

function sendToWebhook(message, eventType, sourceMode) {
  var subject = String(message.getSubject() || "");
  var body = String(message.getPlainBody() || message.getBody() || "");
  var from = String(message.getFrom() || "");
  var messageId = String(message.getId() || "");
  var msgDate = message.getDate();
  var dateIso = msgDate ? msgDate.toISOString() : new Date().toISOString();
  var ts = Date.now();
  var idempotencyKey = "turo-" + messageId + "-" + eventType;
  if (sourceMode === "location_backfill") {
    idempotencyKey += "-loc-" + Math.floor(ts / 86400000);
  }

  try {
    var response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + WEBHOOK_SECRET,
        "x-idempotency-key": idempotencyKey,
        "x-webhook-timestamp": String(ts),
      },
      payload: JSON.stringify({
        emailText: body,
        subject: subject,
        from: from,
        date: dateIso,
        messageId: messageId,
        eventType: eventType,
        sourceMode: sourceMode,
      }),
      muteHttpExceptions: true,
    });

    var code = response.getResponseCode();
    var result = response.getContentText();
    if (code === 200 || code === 201) {
      logWebhookSuccess(result);
      return { ok: true };
    }
    Logger.log("Webhook response " + code + " for " + eventType + ": " + result);
    return { ok: false };
  } catch (err) {
    Logger.log("Webhook error for " + eventType + ": " + err.toString());
    return { ok: false };
  }
}

// ═══════ HELPERS ═══════
function buildIncrementalQuery(lastSyncIso) {
  var fallback = TURO_FROM_QUERY + " newer_than:14d";
  if (!lastSyncIso) return fallback;
  var dt = new Date(lastSyncIso);
  if (isNaN(dt.getTime())) return fallback;
  var y = dt.getFullYear();
  var m = String(dt.getMonth() + 1).padStart(2, "0");
  var d = String(dt.getDate()).padStart(2, "0");
  return TURO_FROM_QUERY + " after:" + y + "/" + m + "/" + d + " newer_than:14d";
}

function buildBackfillQuery(days, mode) {
  if (mode === "cancellation") {
    return 'from:turo.com (cancel OR cancelled OR canceled OR "you\'ve cancelled" OR "you\'ve canceled") newer_than:' + days + "d";
  }
  if (mode === "location") {
    return 'from:turo.com ("is booked" OR booked) newer_than:' + days + "d";
  }
  return "from:turo.com newer_than:" + days + "d";
}

function searchThreadsCapped(query, maxThreads, startOffset) {
  var safeMax = Math.max(1, Math.min(Number(maxThreads) || 20, 300));
  var offset = Math.max(0, Number(startOffset) || 0);
  var allThreads = [];

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

function classifyEventType(subject, body) {
  if (isCancellationEmail(subject, body)) return "cancellation";
  if (/extension|extended|change request|trip has changed/i.test(String(subject || ""))) return "extension";
  return "booking";
}

function needsAccuracyRefresh(subject, body) {
  var subj = String(subject || "");
  var bod = String(body || "");
  var combined = subj + "\n" + bod;
  var lower = combined.toLowerCase();

  // Subject has "at … is booked" but Gmail plain body is compact booked-by — location may be missing in DB.
  if (
    /trip\s+with\s+your\s+.+?\s+at\s+.+\s+(?:is\s+)?booked/i.test(subj) &&
    /trip\s+start/i.test(bod) &&
    !/pick[\s-]?up\s+location/i.test(bod)
  ) {
    return true;
  }

  // Always reconcile when email contains a LOCATION block (DB may still be empty).
  if (
    /(?:^|\n)location\s*\n\s*[A-Z0-9]/im.test(combined) ||
    /\blocation\s+\d{1,6}\s+/i.test(combined)
  ) {
    return true;
  }

  var hasTripDates = /trip\s+start/i.test(lower) || /booked\s+from/i.test(lower);
  var hasRealLocationHint =
    /pick[\s-]?up\s+location|drop[\s-]?off\s+location|return\s+location/i.test(combined) ||
    /trip\s+with\s+your\s+.+?\s+at\s+.+\s+(?:is\s+)?booked/i.test(combined) ||
    /(?:^|\n)delivery\s+[A-Z]/m.test(combined) ||
    /(?:^|\n)location\s*\n\s*[A-Z0-9]/m.test(combined);
  var hasTimeHint = /\d{1,2}:\d{2}\s*(?:am|pm)/i.test(combined);
  return hasTripDates && (!hasRealLocationHint || !hasTimeHint);
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
  return Boolean(getScriptProp(processedKey(messageId), ""));
}

function markProcessedMessage(messageId) {
  if (!messageId) return;
  setScriptProp(processedKey(messageId), String(Date.now()));
}

function rememberRecentMessageId(messageId) {
  if (!messageId) return;
  var ids = getRecentMessageIds();
  var filtered = ids.filter(function (id) {
    return id !== messageId;
  });
  filtered.unshift(messageId);
  setScriptProp(RECENT_IDS_KEY, filtered.slice(0, 200).join(","));
}

function getRecentMessageIds() {
  var raw = getScriptProp(RECENT_IDS_KEY, "");
  if (!raw) return [];
  return raw.split(",").filter(function (id) {
    return Boolean(id);
  });
}

function trimRecentMessageIds(maxLen) {
  var ids = getRecentMessageIds().slice(0, Math.max(1, Number(maxLen) || 100));
  setScriptProp(RECENT_IDS_KEY, ids.join(","));
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
      if (!isFinite(ts) || ts < cutoffMs) toDelete.push(key);
    }
  }
  for (var i = 0; i < toDelete.length; i++) props.deleteProperty(toDelete[i]);
  if (toDelete.length > 0) Logger.log("Pruned processed keys: " + toDelete.length);
}

function tryAcquireLock() {
  var current = Number(getScriptProp(LOCK_KEY, "0"));
  var now = Date.now();
  if (current && now - current < LOCK_TTL_MS) return { acquired: false };
  setScriptProp(LOCK_KEY, String(now));
  return { acquired: true };
}

function releaseLock() {
  deleteScriptProp(LOCK_KEY);
}

function removeProjectTrigger(functionName) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function getScriptProp(key, fallback) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  return value == null ? fallback : value;
}

function setScriptProp(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, String(value));
}

function deleteScriptProp(key) {
  PropertiesService.getScriptProperties().deleteProperty(key);
}

function logWebhookSuccess(result) {
  try {
    var parsed = JSON.parse(result);
    Logger.log("Webhook OK action=" + (parsed.action || "handled"));
  } catch (e) {
    Logger.log("Webhook OK");
  }
}
