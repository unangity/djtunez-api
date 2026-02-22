import { FastifyReply, FastifyRequest } from "fastify";
import { httpStatusMap } from "../utils/http-status-map";
import { rtdb } from "../db/rtdb";

// ========= types =========

export type EventIdParam = { id: string };
export type DjIdParam = { id: string };
export type QueueEventIdParam = { eventId: string };

export type SubmitSongRequestBody = {
  title: string;
  artist: string;
  cover: string;
  requesterEmail: string;
  amount: number;
  currency: string;
};

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
    const snapshot = await rtdb.ref(`/events/${id}`).once("value");
    if (!snapshot.exists()) {
      return reply
        .code(httpStatusMap.notFound)
        .send({ error: "Event not found" });
    }

    const raw = snapshot.val();
    const event = {
      id,
      djID: raw.djId ?? "",
      location: raw.city ? `${raw.venue}, ${raw.city}` : (raw.venue ?? ""),
      genres: raw.genres ?? [],
      tracks: raw.tracks ?? [],
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
    const snapshot = await rtdb.ref(`/djs/${id}`).once("value");
    if (!snapshot.exists()) {
      return reply
        .code(httpStatusMap.notFound)
        .send({ error: "DJ not found" });
    }

    const raw = snapshot.val();
    const dj = {
      id,
      stageName: raw.stageName ?? "",
      bio: raw.bio ?? "",
      cover: raw.wallpaper ?? raw.avatar ?? "",
      ratings: raw.ratings ?? 0,
      price: raw.price ?? 0,
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
 * POST /api/djtunez/queue/:eventId
 *
 * Writes a fan's song request to RTDB at /events/{eventId}/queue/{newId}.
 * The position is set to the current queue length so new requests go to
 * the back of the queue (same convention used in djtunez/services/queue.ts).
 *
 * Call this after Stripe payment succeeds.
 */
export const submit_song_request = async (
  request: FastifyRequest<{
    Params: QueueEventIdParam;
    Body: SubmitSongRequestBody;
  }>,
  reply: FastifyReply
) => {
  const { eventId } = request.params;
  const { title, artist, cover, requesterEmail, amount, currency } =
    request.body;

  try {
    // Verify the event exists
    const eventSnap = await rtdb.ref(`/events/${eventId}`).once("value");
    if (!eventSnap.exists()) {
      return reply
        .code(httpStatusMap.notFound)
        .send({ error: "Event not found" });
    }

    // Determine queue position (append to end)
    const queueSnap = await rtdb
      .ref(`/events/${eventId}/queue`)
      .once("value");
    const queueData = queueSnap.val();
    const position = queueData ? Object.keys(queueData).length : 0;

    // Push the new request — Firebase generates a unique key
    const newRef = rtdb.ref(`/events/${eventId}/queue`).push();
    const requestId = newRef.key!;

    await newRef.set({
      title,
      artist,
      cover,
      requesterEmail,
      status: "pending",
      timestamp: Date.now(),
      amount,
      currency,
      position,
    });

    reply
      .code(httpStatusMap.created)
      .send({ message: "Song request submitted", requestId });
  } catch (error) {
    reply
      .code(httpStatusMap.internalServerError)
      .send({ error: "Failed to submit song request" });
  }
};
