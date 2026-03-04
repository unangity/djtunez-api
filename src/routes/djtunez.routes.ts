import Joi from "joi";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  get_event,
  get_dj,
  get_live_event,
  register_dj_user,
} from "../handlers/djtunez.handlers";
import {
  eventIdParam,
  djUsernameParam,
  djUsernameLiveEventParam,
  registerBodySchema,
  eventResponseSchema,
  djResponseSchema,
  errorResponseSchema,
} from "../schemas/djtunez.schema";

/**
 * Public DJTunez routes - no auth required.
 * Registered in app.ts outside the auth pre-handler scope.
 *
 * GET  /reqrave/event/:id                    - fetch event info for fans
 * GET  /reqrave/dj/:username               - fetch DJ info by plain-text username
 * GET  /reqrave/dj/:username/live-event    - fetch DJ's current live event
 * POST /reqrave/register                    - stamp 'dj' role on a new account
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
    "/dj/:username",
    {
      schema: {
        params: djUsernameParam,
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
    "/dj/:username/live-event",
    {
      schema: {
        params: djUsernameLiveEventParam,
        response: {
          200: eventResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    get_live_event
  );

  router.post(
    "/register",
    {
      schema: {
        body: registerBodySchema,
        response: {
          200: Joi.object({ success: Joi.boolean().required() }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    register_dj_user
  );

  done();
};
