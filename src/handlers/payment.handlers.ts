import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";
import { httpStatusMap } from "../utils/http-status-map";
import DB from "../db";

const db = new DB();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

type CreatePaymentIntentBody = {
  djId: string;
  eventId: string;
  title: string;
  artist: string;
  cover: string;
  requesterEmail: string;
  amount: number;
  currency: string;
};

/**
 * POST /api/payment/create-intent
 *
 * Creates a Stripe PaymentIntent for a fan's song request.
 * Reads the event's price, currency, and the DJ's Stripe account from RTDB
 * so the web-ui never needs access to those values directly.
 *
 * Full metadata is embedded so the payment_intent.succeeded webhook
 * can write the song request to the queue without any client-side round-trip.
 *
 * Public - no auth required. Called by the fan-facing web-ui.
 */
export const create_payment_intent = async (
  request: FastifyRequest<{ Body: CreatePaymentIntentBody }>,
  reply: FastifyReply
) => {
  const { djId, eventId, title, artist, cover, requesterEmail, amount, currency } = request.body;

  try {
    const stripeSnap = await db.rtdb.ref(`/users/${djId}/stripe`).once("value");
    const stripeData = stripeSnap.val();

    if (!stripeData?.accountId) {
      return reply
        .code(httpStatusMap.badRequest)
        .send({ error: "DJ has not connected a Stripe account" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      receipt_email: requesterEmail,
      transfer_data: { destination: stripeData.accountId },
      metadata: {
        djId,
        eventId,
        title,
        artist,
        cover,
        requesterEmail,
        amount: String(amount),
        currency,
      },
    });

    reply
      .code(httpStatusMap.ok)
      .send({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    reply
      .code(httpStatusMap.internalServerError)
      .send({ error: error.message ?? "Failed to create payment intent" });
  }
};
