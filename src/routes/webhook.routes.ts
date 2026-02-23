import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { handle_webhook } from "../handlers/webhook.handlers";

/**
 * Stripe webhook routes - no Firebase auth (Stripe signs requests instead).
 *
 * POST /api/webhooks/stripe
 *
 * The JSON content-type parser is overridden to deliver the raw Buffer so
 * stripe.webhooks.constructEvent() can verify the Stripe-Signature header.
 */
export default (
  router: FastifyInstance,
  opts: FastifyPluginOptions,
  done: () => void
) => {
  // Receive the body as a raw Buffer - required for Stripe signature verification.
  router.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => done(null, body)
  );

  router.post("/stripe", {}, handle_webhook);

  done();
};
