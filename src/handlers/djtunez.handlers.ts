import { FastifyReply, FastifyRequest } from "fastify";
import { httpStatusMap } from "../utils/http-status-map";
import DB from "../db";

/**
 * POST /api/djtunez/register
 *
 * Called immediately after a DJ creates their Firebase Auth account
 * (createUserWithEmailAndPassword). Stamps role: 'dj' as a custom claim
 * so the DJ can access the authenticated /api/stripe/* and /api/user/* routes.
 *
 * Auth: Bearer token in Authorization header (fresh ID token from the new account).
 * No role check — the whole point of this endpoint is to assign the role.
 */
export const register_dj_user = async (
  request: FastifyRequest,
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

  try {
    const decoded = await db.auth.verifyToken(token);
    await db.auth.setDJRole(decoded.uid);
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
export type DjIdParam = { id: string };

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
 * GET /api/djtunez/dj/:id
 *
 * Reads DJ info from RTDB at /djs/{id} and returns it shaped as the
 * web-ui's DJInfoProps: { id, stageName, bio, cover, ratings, price, currency, currencySymbol }.
 *
 * Expected RTDB shape at /djs/{id}:
 *   stageName: string
 *   bio?: string
 *   wallpaper?: string   (used as web-ui "cover")
 *   ratings?: number
 *   price: number        (price per request in the DJ's currency)
 *   currency: string
 *   currencySymbol: string
 */
export const get_dj = async (
  request: FastifyRequest<{ Params: DjIdParam }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  try {
    // TODO: Fetch auth user before RTDB
    const [snapshot, authUser] = await Promise.all([
      db.rtdb.ref(`/users/${id}/profile`).once("value"),
      db.auth.getUser(id),
    ]);

    if (!snapshot.exists()) {
      return reply
        .code(httpStatusMap.notFound)
        .send({ error: "DJ not found" });
    }

    const raw = snapshot.val();
    const dj = {
      id,
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

export type DjIdLiveEventParam = { djId: string };

/**
 * GET /api/djtunez/dj/:djId/live-event
 *
 * Returns the DJ's current live event — the one event where live === true.
 * Reads /users/{djId}/events for the list of event IDs, fetches each in
 * parallel, and returns the first one with live: true.
 *
 * Response shape is identical to GET /api/djtunez/event/:id.
 */
export const get_live_event = async (
  request: FastifyRequest<{ Params: DjIdLiveEventParam }>,
  reply: FastifyReply
) => {
  const { djId } = request.params;
  try {
    // Events are stored at /users/{djId}/events/{eventId} by the DJ app.
    const eventsSnap = await db.rtdb
      .ref(`/users/${djId}/events`)
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

