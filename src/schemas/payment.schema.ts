import Joi from "joi";

export const createPaymentIntentSchema = Joi.object({
  djId: Joi.string().min(1).required(),
  eventId: Joi.string().min(1).required(),
  title: Joi.string().min(1).max(200).required(),
  artist: Joi.string().min(1).max(200).required(),
  cover: Joi.string().uri().required(),
  requesterEmail: Joi.string().email().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().min(2).max(5).required(),
});

export const createPaymentIntentResponseSchema = Joi.object({
  clientSecret: Joi.string().required(),
});

export const errorResponseSchema = Joi.object({
  error: Joi.string().required(),
  message: Joi.string(),
});
