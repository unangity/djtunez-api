import admin from "firebase-admin";
import "dotenv/config";

/**
 * Firebase Admin Realtime Database singleton.
 *
 * Initializes a named Firebase app ("djtunez-rtdb") so it stays isolated
 * from the default app used by the cinema routes (DB class in db/index.ts).
 *
 * RTDB paths used by this app:
 *   /djs/{djId}                        — DJ profile (stageName, price, etc.)
 *   /events/{eventId}                  — Event metadata (name, venue, etc.)
 *   /events/{eventId}/queue/{reqId}    — Pending song requests (fan-written)
 *   /events/{eventId}/history/{reqId}  — Played / skipped log (DJ-written)
 *   /users/{uid}/history/{reqId}       — DJ all-time history
 *
 * Environment variables:
 *   GOOGLE_CLOUD_PROJECT      — Firebase project ID (e.g. "djtunez")
 *   FIREBASE_DATABASE_URL     — RTDB URL for local dev / emulator
 *                               e.g. "http://127.0.0.1:9000/?ns=djtunez-default-rtdb"
 */

const APP_NAME = "djtunez-rtdb";

const databaseURL =
  process.env.NODE_ENV === "production"
    ? `https://${process.env.GOOGLE_CLOUD_PROJECT}-default-rtdb.firebaseio.com`
    : process.env.FIREBASE_DATABASE_URL ||
      `http://127.0.0.1:9000/?ns=${process.env.GOOGLE_CLOUD_PROJECT || "djtunez"}-default-rtdb`;

function initRtdbApp(): admin.app.App {
  try {
    return admin.initializeApp(
      { projectId: process.env.GOOGLE_CLOUD_PROJECT, databaseURL },
      APP_NAME
    );
  } catch (error: any) {
    if (/already exists/.test(error.message)) {
      return admin.app(APP_NAME);
    }
    console.error("Firebase Admin RTDB init error:", error);
    throw error;
  }
}

const rtdbApp = initRtdbApp();

export const rtdb = admin.database(rtdbApp);
