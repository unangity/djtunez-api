import Joi from "joi";

export const spotifyTokenResponseSchema = Joi.object({
  access_token: Joi.string().required(),
  token_type: Joi.string().required(),
  expires_in: Joi.number().required(),
}).unknown(true);

export const errorResponseSchema = Joi.object({
  error: Joi.string().required(),
  message: Joi.string(),
});
