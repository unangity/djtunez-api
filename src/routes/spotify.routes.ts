import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { get_spotify_token } from "../handlers/spotify.handlers";
import {
  spotifyTokenResponseSchema,
  errorResponseSchema,
} from "../schemas/spotify.schema";

/**
 * Public Spotify routes — no auth required.
 *
 * GET /api/spotify/token — exchange client credentials for a Spotify access token
 */
export default (
  router: FastifyInstance,
  opts: FastifyPluginOptions,
  done: () => void
) => {
  router.get(
    "/token",
    {
      schema: {
        response: {
          200: spotifyTokenResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    get_spotify_token
  );

  done();
};
