import Joi from "joi";

export const errorResponseSchema = Joi.object({
  error: Joi.string().required(),
  message: Joi.string(),
});

// ========= PARAMS =========

export const accountIdParam = Joi.object({
  accountId: Joi.string().min(1).required(),
});

// ========= BODY SCHEMAS =========

export const createAccountSchema = Joi.object({
  displayName: Joi.string().min(1).required(),
  country: Joi.string().length(2).uppercase().required(),
  email: Joi.string().email().required(),
});

export const createAccountLinkSchema = Joi.object({
  accountId: Joi.string().min(1).required(),
  returnUrl: Joi.string().uri().required(),
  refreshUrl: Joi.string().uri().required(),
});

export const createProductSchema = Joi.object({
  name: Joi.string().min(1).required(),
  description: Joi.string().allow(""),
  amount: Joi.number().positive().required(),
  currency: Joi.string().min(2).max(5).lowercase().required(),
  connectedAccountId: Joi.string().min(1).required(),
});

export const createCheckoutSessionSchema = Joi.object({
  priceId: Joi.string().min(1).required(),
  connectedAccountId: Joi.string().min(1).required(),
  applicationFeePercent: Joi.number().min(0).max(100),
  successUrl: Joi.string().uri().required(),
  cancelUrl: Joi.string().uri().required(),
  // Song request metadata - stored on the session so the webhook can write
  // the request to the RTDB queue when checkout.session.completed fires.
  metadata: Joi.object({
    eventId:        Joi.string().required(),
    title:          Joi.string().required(),
    artist:         Joi.string().required(),
    cover:          Joi.string().allow(""),
    requesterEmail: Joi.string().email().required(),
    amount:         Joi.string().required(), // major unit as string (e.g. "2.99")
    currency:       Joi.string().min(2).max(5).lowercase().required(),
  }).required(),
});

export const requestPayoutSchema = Joi.object({
  accountId: Joi.string().min(1).required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().min(2).max(5).lowercase().required(),
});

export const listProductsQuerySchema = Joi.object({
  connectedAccountId: Joi.string().min(1),
});

// ========= RESPONSE SCHEMAS =========

const stripeAccountSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string(),
  country: Joi.string(),
  email: Joi.string().allow(null, ""),
  details_submitted: Joi.boolean(),
}).unknown(true); // Stripe returns many more fields

export const createAccountResponseSchema = Joi.object({
  account: Joi.object({
    id: Joi.string().required(),
    display_name: Joi.string().allow(null, ""),
  }).required(),
});

export const accountStatusResponseSchema = Joi.object({
  account: stripeAccountSchema.required(),
  onboardingComplete: Joi.boolean().required(),
  readyToReceivePayments: Joi.boolean().required(),
});

export const accountLinkResponseSchema = Joi.object({
  url: Joi.string().required(),
});

const stripePriceSchema = Joi.object({
  id: Joi.string().required(),
  unit_amount: Joi.number().required(),
  currency: Joi.string().required(),
}).unknown(true);

const stripeProductSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().allow(null, ""),
  active: Joi.boolean(),
  metadata: Joi.object().unknown(true),
  default_price: stripePriceSchema.allow(null),
}).unknown(true);

export const createProductResponseSchema = Joi.object({
  product: stripeProductSchema.required(),
  price: stripePriceSchema.required(),
});

export const listProductsResponseSchema = Joi.object({
  products: Joi.array().items(stripeProductSchema).required(),
});

export const balanceResponseSchema = Joi.object({
  available: Joi.array()
    .items(Joi.object({ amount: Joi.number(), currency: Joi.string() }))
    .required(),
  pending: Joi.array()
    .items(Joi.object({ amount: Joi.number(), currency: Joi.string() }))
    .required(),
});

export const payoutResponseSchema = Joi.object({
  payout: Joi.object({
    id: Joi.string().required(),
    status: Joi.string().required(),
    amount: Joi.number().required(),
  }).required(),
});

export const checkoutSessionResponseSchema = Joi.object({
  url: Joi.string().required(),
  sessionId: Joi.string().required(),
});
