import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";
import DB from "../db";
import { httpStatusMap } from "../utils/http-status-map";

const db = new DB();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

/**
 * POST /api/webhooks/stripe
 *
 * Single entry point for all Stripe webhook events.
 * Stripe signs each request; the raw body is verified against the signature
 * before any data is processed.
 *
 * Handled events:
 *   account.updated            - sync Stripe onboarding status to RTDB
 *   payment_intent.succeeded   - write song request to RTDB event queue (embedded form)
 *   checkout.session.completed - write song request to RTDB event queue (hosted checkout)
 *
 * Set STRIPE_WEBHOOK_SECRET from `stripe listen` output (dev) or the
 * Stripe Dashboard webhook endpoint (prod).
 */
export const handle_webhook = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const sig = request.headers["stripe-signature"] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(request.body as Buffer, sig, secret);
  } catch (err: any) {
    return reply
      .code(httpStatusMap.badRequest)
      .send({ error: `Webhook signature invalid: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "account.updated":
        await onAccountUpdated(event.data.object as Stripe.Account);
        break;

      case "payment_intent.succeeded":
        await onPaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        // Unhandled event type - acknowledge without processing.
        break;
    }

    return reply.code(httpStatusMap.ok).send({ received: true });
  } catch (err: any) {
    return reply
      .code(httpStatusMap.internalServerError)
      .send({ error: err.message ?? "Webhook handler failed" });
  }
};

//  account.updated 

async function onAccountUpdated(account: Stripe.Account) {
  const rtdb = db.rtdb;

  // Find the Firebase user whose stripe.accountId matches this Stripe account.
  const snap = await rtdb
    .ref("/users")
    .orderByChild("stripe/accountId")
    .equalTo(account.id)
    .once("value");

  if (!snap.exists()) return;

  snap.forEach((child) => {
    const uid = child.key!;
    rtdb.ref(`/users/${uid}/stripe/isOnboarded`).set(
      account.details_submitted === true
    );
  });
}

//  Shared queue metadata shape 

type QueueMetadata = {
  djId: string;
  eventId: string;
  title: string;
  artist: string;
  cover: string;
  requesterEmail: string;
  amount: string; // major unit as string, e.g. "2.99"
  currency: string;
};

async function writeToQueue(m: QueueMetadata) {
  const rtdb = db.rtdb;

  if (!m.djId) return; // guard: djId must be present to locate the event

  const eventPath = `/users/${m.djId}/events/${m.eventId}`;

  // Verify event exists.
  const eventSnap = await rtdb.ref(eventPath).once("value");
  if (!eventSnap.exists()) return;

  // Determine queue position (append to end).
  const queueSnap = await rtdb.ref(`${eventPath}/queue`).once("value");
  const position = queueSnap.exists() ? Object.keys(queueSnap.val()).length : 0;

  await rtdb.ref(`${eventPath}/queue`).push().set({
    title:          m.title,
    artist:         m.artist,
    cover:          m.cover ?? "",
    requesterEmail: m.requesterEmail,
    status:         "pending",
    timestamp:      Date.now(),
    amount:         parseFloat(m.amount),
    currency:       m.currency,
    position,
  });
}

//  payment_intent.succeeded 

async function onPaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
  const m = intent.metadata as QueueMetadata | null;
  if (!m?.eventId) return;
  await writeToQueue(m);
}

//  checkout.session.completed 

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;
  const m = session.metadata as QueueMetadata | null;
  if (!m?.eventId) return;
  await writeToQueue(m);
}
