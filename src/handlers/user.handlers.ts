import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";
import DB from "../db";
import { httpStatusMap } from "../utils/http-status-map";

const db = new DB();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

/**
 * DELETE /api/user/me
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
    const rtdb = db.rtdb;

    // Read stripe accountId and event IDs in parallel before touching anything.
    const [stripeSnap, eventsSnap] = await Promise.all([
      rtdb.ref(`users/${uid}/stripe`).once("value"),
      rtdb.ref(`users/${uid}/events`).once("value"),
    ]);

    const stripeAccountId: string | null = stripeSnap.val()?.accountId ?? null;
    const eventsData = eventsSnap.val();
    const eventIds: string[] = eventsData ? Object.keys(eventsData) : [];

    // Delete event queue/history nodes (keyed by event, not uid).
    await Promise.all(eventIds.map((id) => rtdb.ref(`events/${id}`).remove()));

    // Wipe all data under /users/{uid} (profile, stripe, planned events, history).
    await rtdb.ref(`users/${uid}`).remove();

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
