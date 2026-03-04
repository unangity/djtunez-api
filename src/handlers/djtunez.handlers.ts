import { FastifyReply, FastifyRequest } from "fastify";
import { httpStatusMap } from "../utils/http-status-map";
import DB from "../db";

export type RegisterBody = { username: string; stageName: string };

/**
 * POST /api/djtunez/register
 *
 * Called immediately after a DJ creates their Firebase Auth account.
 * Body: { username, stageName }
 *
 * Does three things:
 *   1. Checks /usernames/{username}  returns 409 if already taken.
 *   2. Stamps role: 'dj' as a custom claim on the Auth user.
 *   3. Seeds /users/{username}/profile and writes /usernames/{username}: true.
 *
 * The username is used directly as the RTDB key. Access is protected by
 * RTDB security rules (auth.token.name === $username).
 *
 * Auth: Bearer token in Authorization header (fresh ID token).
 */
export const register_dj_user = async (
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply
) => {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return reply
      .code(httpStatusMap.unauthorized)
      .send({ error: "Missing Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return reply
      .code(httpStatusMap.unauthorized)
      .send({ error: "Malformed Authorization header" });
  }

  const { username, stageName } = request.body ?? {};
  if (!username || typeof username !== "string") {
    return reply
      .code(httpStatusMap.badRequest)
      .send({ error: "username is required in the request body" });
  }

  try {
    // Server-side uniqueness check  guards against races between clients.
    const existingSnap = await db.rtdb.ref(`/usernames/${username}`).once("value");
    if (existingSnap.exists()) {
      return reply
        .code(httpStatusMap.conflict)
        .send({ error: "Username is already taken" });
    }

    const decoded = await db.auth.verifyToken(token);

    await Promise.all([
      db.auth.setDJRole(decoded.uid),
      db.rtdb.ref(`/users/${username}/profile`).update({
        stageName: stageName ?? "",
        bio: "",
        wallpaper: "",
        rating: 0,
        currency: "eur",
        currencySymbol: "€",
      }),
      // Flat index so clients can load all taken usernames in one read.
      db.rtdb.ref(`/usernames/${username}`).set(true),
    ]);

    return reply.code(httpStatusMap.ok).send({ success: true });
  } catch (err: any) {
    return reply
      .code(httpStatusMap.unauthorized)
      .send({ error: err.message ?? "Invalid token" });
  }
};

const db = new DB();

export type EventIdParam = { id: string };
export type DjUsernameParam = { username: string };
export type DjUsernameLiveEventParam = { username: string };

// ========= handlers =========

/**
 * GET /api/djtunez/event/:id
 *
 * Reads event metadata from RTDB at /events/{id}.
 */
export const get_event = async (
  request: FastifyRequest<{ Params: EventIdParam }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  try {
    const snapshot = await db.rtdb.ref(`/events/${id}`).once("value");
    if (!snapshot.exists()) {
      return reply
        .code(httpStatusMap.notFound)
        .send({ error: "Event not found" });
    }

    const raw = snapshot.val();
    const event = {
      id,
      djId: raw.djId ?? "",
      name: raw.name ?? "",
      venue: raw.venue ?? "",
      city: raw.city ?? "",
      startDate: raw.startDate ?? "",
      ...(raw.endDate ? { endDate: raw.endDate } : {}),
      startTime: raw.startTime ?? "",
      endTime: raw.endTime ?? "",
      status: raw.status ?? "",
      live: raw.live ?? false,
      genres: raw.genres ?? [],
      tracks: raw.tracks ?? [],
      price: raw.price ?? 0,
      currency: raw.currency ?? "",
      currencySymbol: raw.currencySymbol ?? "",
    };

    reply.code(httpStatusMap.ok).send({ message: "Successful", event });
  } catch (error) {
    reply
      .code(httpStatusMap.internalServerError)
      .send({ error: "Failed to fetch event" });
  }
};

/**
 * GET /api/djtunez/dj/:username
 *
 * Fetches /users/{username}/profile and returns the DJ data.
 * auth_id is never sent in the response.
 */
export const get_dj = async (
  request: FastifyRequest<{ Params: DjUsernameParam }>,
  reply: FastifyReply
) => {
  const { username } = request.params;
  try {
    const snapshot = await db.rtdb
      .ref(`/users/${username}/profile`)
      .once("value");

    if (!snapshot.exists()) {
      return reply
        .code(httpStatusMap.notFound)
        .send({ error: "DJ not found" });
    }

    const raw = snapshot.val();

    const dj = {
      stageName: raw.stageName ?? "",
      bio: raw.bio ?? "",
      cover: raw.wallpaper ?? "",
      ratings: raw.rating ?? 0,
      currency: raw.currency ?? "",
      currencySymbol: raw.currencySymbol ?? "",
    };

    reply.code(httpStatusMap.ok).send({ message: "Successful", dj });
  } catch (error) {
    reply
      .code(httpStatusMap.internalServerError)
      .send({ error: "Failed to fetch DJ info" });
  }
};

/**
 * GET /api/djtunez/dj/:username/live-event
 *
 * Returns the DJ's current live event (live === true) from
 * /users/{username}/events.
 */
export const get_live_event = async (
  request: FastifyRequest<{ Params: DjUsernameLiveEventParam }>,
  reply: FastifyReply
) => {
  const { username } = request.params;
  try {
    const eventsSnap = await db.rtdb
      .ref(`/users/${username}/events`)
      .orderByChild("live")
      .equalTo(true)
      .once("value");

    if (!eventsSnap.exists()) {
      return reply
        .code(httpStatusMap.notFound)
        .send({ error: "No live event found" });
    }

    const eventsVal = eventsSnap.val() as Record<string, any>;
    const [id, raw] = Object.entries(eventsVal)[0];

    const event = {
      id,
      djId: raw.djId ?? "",
      name: raw.name ?? "",
      venue: raw.venue ?? "",
      city: raw.city ?? "",
      startDate: raw.startDate ?? "",
      ...(raw.endDate ? { endDate: raw.endDate } : {}),
      startTime: raw.startTime ?? "",
      endTime: raw.endTime ?? "",
      status: raw.status ?? "",
      live: raw.live ?? false,
      genres: raw.genres ?? [],
      tracks: raw.tracks ?? [],
      price: raw.price ?? 0,
      currency: raw.currency ?? "",
      currencySymbol: raw.currencySymbol ?? "",
    };

    reply.code(httpStatusMap.ok).send({ message: "Successful", event });
  } catch (error) {
    reply
      .code(httpStatusMap.internalServerError)
      .send({ error: "Failed to fetch live event" });
  }
};
