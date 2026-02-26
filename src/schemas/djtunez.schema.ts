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

export const djIdLiveEventParam = Joi.object({
  djId: Joi.string().min(1).required(),
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
    price: Joi.number().required(),
    currency: Joi.string().allow(""),
    currencySymbol: Joi.string().allow(""),
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
    currency: Joi.string().required(),
    currencySymbol: Joi.string().required(),
  }).required(),
});

