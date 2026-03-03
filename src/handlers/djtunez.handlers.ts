import { FastifyReply, FastifyRequest } from "fastify";
import { httpStatusMap } from "../utils/http-status-map";
import { encryptUsername } from "../utils/username";
import DB from "../db";

export type RegisterBody = { username: string };

/**
 * POST /api/djtunez/register
 *
 * Called immediately after a DJ creates their Firebase Auth account.
 * Body: { username } — the plain-text username chosen during sign-up.
 *
 * Does four things:
 *   1. Checks /usernames/{username} — returns 409 if already taken.
 *   2. Stamps role: 'dj' as a custom claim on the Auth user.
 *   3. Derives the RTDB ID via HMAC-SHA256(username) and seeds
 *      /users/{encryptedId}/profile with { _id, _authId }.
 *   4. Writes /usernames/{username}: true as a flat uniqueness index.
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

  const { username } = request.body ?? {};
  if (!username || typeof username !== "string") {
    return reply
      .code(httpStatusMap.badRequest)
      .send({ error: "username is required in the request body" });
  }

  try {
    // Server-side uniqueness check — guards against races between clients.
    const existingSnap = await db.rtdb.ref(`/usernames/${username}`).once("value");
    if (existingSnap.exists()) {
      return reply
        .code(httpStatusMap.conflict)
        .send({ error: "Username is already taken" });
    }

    const decoded = await db.auth.verifyToken(token);
    const encryptedId = encryptUsername(username);

    await Promise.all([
      db.auth.setDJRole(decoded.uid),
      // _id and _authId are internal — never returned in any public response.
      db.rtdb.ref(`/users/${encryptedId}/profile`).update({
        _id: encryptedId,
        _authId: decoded.uid,
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

// ========= types =========

export type EventIdParam = { id: string };
export type DjUsernameParam = { username: string };
export type DjUsernameLiveEventParam = { username: string };

// ========= handlers =========

/**
 * GET /api/djtunez/event/:id
 *
 * Reads event metadata from RTDB at /events/{id} and returns it shaped
 * as the web-ui's EventProps: { id, djID, location, genres, tracks }.
 *
 * Expected RTDB shape at /events/{id}:
 *   djId: string
 *   name: string
 *   venue: string
 *   city: string
 *   date: string
 *   startTime: string
 *   endTime: string
 *   status: 'upcoming' | 'active' | 'completed'
 *   genres?: string[]
 *   tracks?: string[]
 *   queue/...        (ignored here)
 *   history/...      (ignored here)
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
 * Accepts the DJ's plain-text username from the URL. Derives the RTDB ID
 * via HMAC-SHA256(username) server-side, fetches /users/{encryptedId}/profile,
 * then fetches the Firebase Auth user using the stored _authId.
 *
 * Response merges RTDB profile data with Auth data (displayName as stageName).
 * Neither the encrypted ID nor the Firebase Auth UID is ever sent in the response.
 */
export const get_dj = async (
  request: FastifyRequest<{ Params: DjUsernameParam }>,
  reply: FastifyReply
) => {
  const { username } = request.params;
  try {
    const encryptedId = encryptUsername(username);
    const snapshot = await db.rtdb
      .ref(`/users/${encryptedId}/profile`)
      .once("value");

    if (!snapshot.exists()) {
      return reply
        .code(httpStatusMap.notFound)
        .send({ error: "DJ not found" });
    }

    const raw = snapshot.val();
    const authId = raw._authId as string | undefined;
    if (!authId) {
      return reply
        .code(httpStatusMap.notFound)
        .send({ error: "DJ not found" });
    }

    const authUser = await db.auth.getUser(authId);

    const dj = {
      stageName: authUser.displayName ?? "",
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
 * Returns the DJ's current live event — the one event where live === true.
 * Encrypts the username to derive the RTDB ID, reads /users/{encryptedId}/events,
 * and returns the first event with live: true.
 *
 * Response shape is identical to GET /api/djtunez/event/:id.
 */
export const get_live_event = async (
  request: FastifyRequest<{ Params: DjUsernameLiveEventParam }>,
  reply: FastifyReply
) => {
  const { username } = request.params;
  try {
    const encryptedId = encryptUsername(username);

    // Events are stored at /users/{encryptedId}/events/{eventId} by the DJ app.
    const eventsSnap = await db.rtdb
      .ref(`/users/${encryptedId}/events`)
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
