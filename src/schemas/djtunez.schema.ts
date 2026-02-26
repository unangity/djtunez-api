import Joi from "joi";

// ========= SHARED =========

export const errorResponseSchema = Joi.object({
  error: Joi.string().required(),
  message: Joi.string(),
});

// ========= PARAMS =========

export const eventIdParam = Joi.object({
  id: Joi.string().min(1).required(),
});

export const djIdParam = Joi.object({
  id: Joi.string().min(1).required(),
});

export const queueEventIdParam = Joi.object({
  eventId: Joi.string().min(1).required(),
});

export const djIdLiveEventParam = Joi.object({
  djId: Joi.string().min(1).required(),
});

// ========= BODY SCHEMAS =========

export const submitSongRequestSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  artist: Joi.string().min(1).max(200).required(),
  cover: Joi.string().uri().required(),
  requesterEmail: Joi.string().email().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().min(2).max(5).required(),
});

// ========= RESPONSE SCHEMAS =========

export const eventResponseSchema = Joi.object({
  message: Joi.string().required(),
  event: Joi.object({
    id: Joi.string().required(),
    djId: Joi.string().required(),
    name: Joi.string().required(),
    venue: Joi.string().allow(""),
    city: Joi.string().allow(""),
    startDate: Joi.string().allow(""),
    endDate: Joi.string().optional(),
    startTime: Joi.string().allow(""),
    endTime: Joi.string().allow(""),
    status: Joi.string().allow(""),
    live: Joi.boolean().required(),
    genres: Joi.array().items(Joi.string()).required(),
    tracks: Joi.array().items(Joi.string()).required(),
  }).required(),
});

export const djResponseSchema = Joi.object({
  message: Joi.string().required(),
  dj: Joi.object({
    id: Joi.string().required(),
    stageName: Joi.string().required(),
    bio: Joi.string().allow(""),
    cover: Joi.string().allow(""),
    ratings: Joi.number(),
    price: Joi.number().required(),
    currency: Joi.string().required(),
    currencySymbol: Joi.string().required(),
  }).required(),
});

export const submitSongRequestResponseSchema = Joi.object({
  message: Joi.string().required(),
  requestId: Joi.string().required(),
});

export const createSongCheckoutSchema = Joi.object({
  djId: Joi.string().min(1).required(),
  eventId: Joi.string().min(1).required(),
  title: Joi.string().min(1).max(200).required(),
  artist: Joi.string().min(1).max(200).required(),
  cover: Joi.string().uri().required(),
  requesterEmail: Joi.string().email().required(),
  successUrl: Joi.string().uri().required(),
  cancelUrl: Joi.string().uri().required(),
});

export const createSongCheckoutResponseSchema = Joi.object({
  url: Joi.string().uri().required(),
  sessionId: Joi.string().required(),
});
