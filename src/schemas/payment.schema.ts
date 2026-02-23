import Joi from "joi";

export const createPaymentIntentSchema = Joi.object({
  trackId: Joi.string().min(1).required(),
  djId: Joi.string().min(1).required(),
  email: Joi.string().email().required(),
});

export const createPaymentIntentResponseSchema = Joi.object({
  clientSecret: Joi.string().required(),
});

export const errorResponseSchema = Joi.object({
  error: Joi.string().required(),
  message: Joi.string(),
});
