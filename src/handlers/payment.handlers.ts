import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";
import { httpStatusMap } from "../utils/http-status-map";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

type CreatePaymentIntentBody = {
  trackId: string;
  djId: string;
  email: string;
};

/**
 * POST /api/payment/create-intent
 * Create a Stripe PaymentIntent for a song request.
 * Public — no auth required. Called by the fan-facing web-ui before checkout.
 */
export const create_payment_intent = async (
  request: FastifyRequest<{ Body: CreatePaymentIntentBody }>,
  reply: FastifyReply
) => {
  const { trackId, djId, email } = request.body;

  // TODO: Look up the booking amount from the DJ's event config in Firebase
  const amount = 1000; // pence/cents — e.g. £10.00
  const currency = "gbp";

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      receipt_email: email,
      metadata: { trackId, djId },
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
