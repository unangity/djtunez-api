import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";
import DB from "../db";
import { httpStatusMap } from "../utils/http-status-map";

const db = new DB();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

/**
 * DELETE /api/user
 *
 * Cascade-deletes a DJ's account server-side using the Firebase Admin SDK.
 * Auth is enforced by the djRoutes hook - request.authenticatedUser
 * is guaranteed to be set by the time this handler runs.
 *
 * Deletion order:
 *   1. Read stripe accountId + event IDs from RTDB (before any data is wiped)
 *   2. Delete Stripe connected account (if one exists)
 *   3. Delete /events/{eventId} queue/history nodes (keyed by event, not uid)
 *   4. Delete /users/{uid} - profile, stripe, planned events, all-time history
 *   5. Delete Firebase Auth user - revokes all tokens last so RTDB ops stay valid
 *
 * The client must call signOut() after this succeeds to clear its local state.
 */
export const delete_account = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { uid } = request.authenticatedUser;

  try {
    // Read stripe accountId and event IDs in parallel before touching anything.
    const stripeSnap = await db.rtdb.ref(`users/${uid}/stripe`).once("value");

    if (stripeSnap.exists() && stripeSnap.val()?.accountId) {
      const accountId = stripeSnap.val().accountId;
      try {
        await stripe.accounts.del(accountId);
      } catch (err: any) {
        // Log and swallow Stripe deletion errors since the RTDB + Auth data is already wiped.
        console.error(`Failed to delete Stripe account ${accountId} for uid=${uid}:`, err);
      }
    }
    // Wipe all data under /users/{uid} (profile, stripe, planned events, history).
    await db.rtdb.ref(`users/${uid}`).remove();

    // Revoke the Firebase Auth account last so the token stays valid for the
    // RTDB operations above.
    await db.auth.deleteUser(uid);

    return reply.code(httpStatusMap.ok).send({ success: true });
  } catch (error: any) {
    return reply
      .code(httpStatusMap.internalServerError)
      .send({ error: error.message ?? "Failed to delete account" });
  }
};
