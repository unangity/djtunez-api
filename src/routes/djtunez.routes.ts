import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  get_event,
  get_dj,
  get_live_event,
  register_dj_user,
} from "../handlers/djtunez.handlers";
import {
  eventIdParam,
  djIdParam,
  djIdLiveEventParam,
  eventResponseSchema,
  djResponseSchema,
  errorResponseSchema,
} from "../schemas/djtunez.schema";

/**
 * Public DJTunez routes - no auth required.
 * Registered in app.ts outside the auth pre-handler scope.
 *
 * GET  /api/djtunez/event/:id             - fetch event info for fans
 * GET  /api/djtunez/dj/:id               - fetch DJ info for fans
 * GET  /api/djtunez/dj/:djId/live-event  - fetch DJ's current live event
 * POST /api/djtunez/register             - stamp 'dj' role on a new account
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

  router.get(
    "/dj/:djId/live-event",
    {
      schema: {
        params: djIdLiveEventParam,
        response: {
          200: eventResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    get_live_event
  );

  router.post("/register", {}, register_dj_user);

  done();
};
