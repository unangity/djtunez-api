import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { create_payment_intent } from "../handlers/payment.handlers";
import {
  createPaymentIntentSchema,
  createPaymentIntentResponseSchema,
  errorResponseSchema,
} from "../schemas/payment.schema";

/**
 * Public payment routes - no auth required.
 *
 * POST /api/payment/create-intent - create a Stripe PaymentIntent for a song request
 */
export default (
  router: FastifyInstance,
  opts: FastifyPluginOptions,
  done: () => void
) => {
  router.post(
    "/create-intent",
    {
      schema: {
        body: createPaymentIntentSchema,
        response: {
          200: createPaymentIntentResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    create_payment_intent
  );

  done();
};
