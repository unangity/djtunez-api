import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";
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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

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
    const snapshot = await db.rtdb.ref(`/events/${id}`).once("value");
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
    const snapshot = await db.rtdb.ref(`/djs/${id}`).once("value");
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
    const eventSnap = await db.rtdb.ref(`/events/${eventId}`).once("value");
    if (!eventSnap.exists()) {
      return reply
        .code(httpStatusMap.notFound)
        .send({ error: "Event not found" });
    }

    // Determine queue position (append to end)
    const queueSnap = await db.rtdb
      .ref(`/events/${eventId}/queue`)
      .once("value");
    const queueData = queueSnap.val();
    const position = queueData ? Object.keys(queueData).length : 0;

    // Push the new request - Firebase generates a unique key
    const newRef = db.rtdb.ref(`/events/${eventId}/queue`).push();
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

export type CreateSongCheckoutBody = {
  djId: string;
  eventId: string;
  title: string;
  artist: string;
  cover: string;
  requesterEmail: string;
  successUrl: string;
  cancelUrl: string;
};

/**
 * POST /api/djtunez/checkout
 *
 * Creates a Stripe Checkout Session for a fan's song request.
 * Reads the DJ's price and Stripe account ID from RTDB server-side,
 * so the web-ui never needs direct access to Stripe account IDs.
 *
 * The webhook (checkout.session.completed) writes the song request
 * to the queue once Stripe confirms payment.
 */
export const create_song_checkout = async (
  request: FastifyRequest<{ Body: CreateSongCheckoutBody }>,
  reply: FastifyReply
) => {
  const {
    djId,
    eventId,
    title,
    artist,
    cover,
    requesterEmail,
    successUrl,
    cancelUrl,
  } = request.body;

  try {
    const [profileSnap, stripeSnap] = await Promise.all([
      db.rtdb.ref(`/users/${djId}/profile`).once("value"),
      db.rtdb.ref(`/users/${djId}/stripe`).once("value"),
    ]);

    if (!profileSnap.exists()) {
      return reply
        .code(httpStatusMap.notFound)
        .send({ error: "DJ not found" });
    }

    const profile = profileSnap.val();
    const stripeData = stripeSnap.val();

    if (!stripeData?.accountId) {
      return reply
        .code(httpStatusMap.badRequest)
        .send({ error: "DJ has not connected a Stripe account" });
    }

    const price: number = profile.price ?? 0;
    const currency: string = profile.currency ?? "eur";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: Math.round(price * 100),
            product_data: { name: `Song Request - ${title}` },
          },
          quantity: 1,
        },
      ],
      customer_email: requesterEmail,
      metadata: {
        eventId,
        title,
        artist,
        cover,
        requesterEmail,
        amount: String(price),
        currency,
      },
      payment_intent_data: {
        transfer_data: { destination: stripeData.accountId },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    reply
      .code(httpStatusMap.created)
      .send({ url: session.url!, sessionId: session.id });
  } catch (error: any) {
    reply
      .code(httpStatusMap.internalServerError)
      .send({ error: error.message ?? "Failed to create checkout session" });
  }
};
