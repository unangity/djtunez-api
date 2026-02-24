import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  get_event,
  get_dj,
  submit_song_request,
  create_song_checkout,
  register_dj_user,
} from "../handlers/djtunez.handlers";
import {
  eventIdParam,
  djIdParam,
  queueEventIdParam,
  submitSongRequestSchema,
  eventResponseSchema,
  djResponseSchema,
  submitSongRequestResponseSchema,
  createSongCheckoutSchema,
  createSongCheckoutResponseSchema,
  errorResponseSchema,
} from "../schemas/djtunez.schema";

/**
 * Public DJTunez routes - no auth required.
 * Registered in app.ts outside the auth pre-handler scope.
 *
 * GET  /api/djtunez/event/:id        - fetch event info for fans
 * GET  /api/djtunez/dj/:id           - fetch DJ info for fans
 * POST /api/djtunez/queue/:eventId   - submit a song request after payment
 */
export default (
  router: FastifyInstance,
  opts: FastifyPluginOptions,
  done: () => void
) => {
  router.get(
    "/event/:id",
    {
      schema: {
        params: eventIdParam,
        response: {
          200: eventResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    get_event
  );

  router.get(
    "/dj/:id",
    {
      schema: {
        params: djIdParam,
        response: {
          200: djResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    get_dj
  );

  router.post(
    "/queue/:eventId",
    {
      schema: {
        params: queueEventIdParam,
        body: submitSongRequestSchema,
        response: {
          201: submitSongRequestResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    submit_song_request
  );
  // TODO: Check if validation is needed
  router.post("/register", {}, register_dj_user);

  router.post(
    "/checkout",
    {
      schema: {
        body: createSongCheckoutSchema,
        response: {
          201: createSongCheckoutResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    create_song_checkout
  );

  done();
};
