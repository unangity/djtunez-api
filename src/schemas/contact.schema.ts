import Joi from "joi";

export const contactBodySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  message: Joi.string().min(1).max(2000).required(),
});

export const contactResponseSchema = Joi.object({
  success: Joi.boolean().required(),
});

export const errorResponseSchema = Joi.object({
  error: Joi.string().required(),
});
