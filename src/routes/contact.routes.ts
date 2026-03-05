import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { send_contact_email } from "../handlers/contact.handlers";
import {
  contactBodySchema,
  contactResponseSchema,
  errorResponseSchema,
} from "../schemas/contact.schema";

/**
 * Public contact routes - no auth required.
 *
 * POST /contact - send a contact form email
 */
export default (
  router: FastifyInstance,
  opts: FastifyPluginOptions,
  done: () => void
) => {
  router.post(
    "/",
    {
      schema: {
        body: contactBodySchema,
        response: {
          200: contactResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    send_contact_email
  );

  done();
};
