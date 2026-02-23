import { FastifyReply, FastifyRequest } from "fastify";
import { httpStatusMap } from "../utils/http-status-map";

/**
 * GET /api/spotify/token
 * Exchange Spotify client credentials for an access token.
 * Credentials are read from SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET env vars.
 */
export const get_spotify_token = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return reply
      .code(httpStatusMap.internalServerError)
      .send({ error: "Spotify credentials not configured" });
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });

    if (!response.ok) {
      const err = await response.json();
      return reply
        .code(httpStatusMap.internalServerError)
        .send({ error: err.error_description ?? "Failed to get Spotify token" });
    }

    const data = await response.json();
    reply.code(httpStatusMap.ok).send(data);
  } catch (error: any) {
    reply
      .code(httpStatusMap.internalServerError)
      .send({ error: error.message ?? "Failed to get Spotify token" });
  }
};
