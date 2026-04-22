/**
 * Google Apps Script — Turo Email → NextGearAuto Webhook Forwarder
 *
 * This script runs on a schedule in your Gmail account. It searches for
 * new Turo booking confirmation emails, forwards the email body to
 * your NextGearAuto webhook endpoint, and marks successful messages as read.
 *
 * ─── SETUP INSTRUCTIONS ───
 *
 * 1. Go to https://script.google.com and create a new project
 * 2. Delete everything in Code.gs and paste this entire file
 * 3. Update the two constants below (WEBHOOK_URL and WEBHOOK_SECRET)
 * 4. Run `setup()` once from the toolbar (Run → setup)
 *    — It will ask for Gmail permissions; grant them
 *    — It creates a 15-minute timer
 * 5. That's it! The script will auto-check every 15 minutes.
 *
 * To test: Run `processNewTuroEmails()` manually from the toolbar
 * To stop: Run `teardown()` to remove the timer
 * To check logs: View → Execution log
 */

// ═══════ CONFIGURATION — EDIT THESE ═══════

const WEBHOOK_URL = "https://rentnextgearauto.com/api/webhooks/turo-email";
const WEBHOOK_SECRET = "PASTE_YOUR_SECRET_HERE"; // Must match TURO_WEBHOOK_SECRET in Vercel

// Gmail search query for Turo booking emails.
// IMPORTANT: Use is:unread at message-level; do NOT rely on thread labels.
const TURO_SEARCH_QUERY = 'from:(no-reply@turo.com OR noreply@turo.com OR noreply@mail.turo.com OR support@turo.com) subject:(trip OR booking OR reservation OR confirmed OR extended OR modified OR extension OR updated) is:unread';

// ═══════ MAIN FUNCTION ═══════

function processNewTuroEmails() {
  const threads = GmailApp.search(TURO_SEARCH_QUERY, 0, 20);

  if (threads.length === 0) {
    Logger.log("No new Turo emails found.");
    return;
  }

  Logger.log("Found " + threads.length + " new Turo email thread(s).");

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      if (!message.isUnread()) continue;
      const subject = message.getSubject();
      const body = message.getPlainBody() || message.getBody();
      const from = message.getFrom();

      // Skip if not actually from Turo
      if (!from.toLowerCase().includes("turo")) {
        continue;
      }

      Logger.log("Processing: " + subject);

      try {
        const response = UrlFetchApp.fetch(WEBHOOK_URL, {
          method: "post",
          contentType: "application/json",
          headers: {
            Authorization: "Bearer " + WEBHOOK_SECRET,
          },
          payload: JSON.stringify({
            emailText: body,
            subject: subject,
            from: from,
            date: message.getDate().toISOString(),
          }),
          muteHttpExceptions: true,
        });

        const code = response.getResponseCode();
        const result = response.getContentText();

        if (code === 201) {
          Logger.log("SUCCESS — Blocked dates created: " + result);
          message.markRead();
        } else if (code === 200) {
          // Check if it was an extension or a skip
          try {
            var parsed = JSON.parse(result);
            if (parsed.action === "extended") {
              Logger.log("EXTENDED — Trip extended: " + result);
            } else {
              Logger.log("SKIPPED — Already blocked: " + result);
            }
          } catch (e) {
            Logger.log("SKIPPED — Already blocked: " + result);
          }
          // 200 means webhook handled it (extended / merged / already blocked)
          message.markRead();
        } else {
          Logger.log("RESPONSE " + code + ": " + result);
          // Keep unread so failures can be retried/reviewed.
        }
      } catch (err) {
        Logger.log("ERROR sending to webhook: " + err.toString());
        // Keep unread so webhook failure retries on next run.
        continue;
      }
    }
  }

  Logger.log("Done processing Turo emails.");
}

// ═══════ SETUP & TEARDOWN ═══════

/**
 * Run this once to create the Gmail label and set up the 15-minute timer.
 */
function setup() {
  // Remove any existing triggers for this function
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === "processNewTuroEmails") {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Create a 15-minute timer trigger
  ScriptApp.newTrigger("processNewTuroEmails")
    .timeBased()
    .everyMinutes(15)
    .create();

  Logger.log("Timer set: processNewTuroEmails will run every 15 minutes.");
  Logger.log("Setup complete! You can also run processNewTuroEmails manually to test.");
}

/**
 * Run this to stop the automatic checking.
 */
function teardown() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === "processNewTuroEmails") {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  }
  Logger.log("Removed " + removed + " trigger(s). Auto-checking is now disabled.");
}

/**
 * One-time helper: backfill recent Turo emails that were missed.
 * Usage: run backfillRecentTuroEmails(60) to process last 60 days.
 *
 * This does NOT mark messages read.
 */
function backfillRecentTuroEmails(days) {
  const safeDays = Math.max(1, Math.min(Number(days) || 30, 365));
  const query = 'from:(no-reply@turo.com OR noreply@turo.com OR noreply@mail.turo.com OR support@turo.com) subject:(trip OR booking OR reservation OR confirmed OR extended OR modified OR extension OR updated) newer_than:' + safeDays + 'd';
  const threads = GmailApp.search(query, 0, 200);
  Logger.log("Backfill threads: " + threads.length + " (newer_than " + safeDays + "d)");

  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const message of messages) {
      const from = message.getFrom();
      if (!from || !from.toLowerCase().includes("turo")) continue;
      const body = message.getPlainBody() || message.getBody();
      const subject = message.getSubject();
      try {
        const response = UrlFetchApp.fetch(WEBHOOK_URL, {
          method: "post",
          contentType: "application/json",
          headers: {
            Authorization: "Bearer " + WEBHOOK_SECRET,
          },
          payload: JSON.stringify({
            emailText: body,
            subject: subject,
            from: from,
            date: message.getDate().toISOString(),
          }),
          muteHttpExceptions: true,
        });
        Logger.log("BACKFILL " + response.getResponseCode() + " — " + subject);
      } catch (err) {
        Logger.log("BACKFILL ERROR: " + err.toString());
      }
    }
  }
}

// ═══════ HELPERS ═══════
