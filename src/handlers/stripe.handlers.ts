import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";
import { httpStatusMap } from "../utils/http-status-map";

// Initialise Stripe with your platform's secret key.
// Set STRIPE_SECRET_KEY in the API .env file.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

// ========= types =========

type CreateAccountBody = { displayName: string; country: string; email: string };
type AccountIdParam = { accountId: string };
type CreateAccountLinkBody = { accountId: string; returnUrl: string; refreshUrl: string };
type CreateProductBody = {
  name: string;
  description: string;
  amount: number;
  currency: string;
  connectedAccountId: string;
};
type ListProductsQuery = { connectedAccountId?: string };
type RequestPayoutBody = { accountId: string; amount: number; currency: string };
type CreateCheckoutBody = {
  priceId: string;
  connectedAccountId: string;
  applicationFeePercent?: number;
  successUrl: string;
  cancelUrl: string;
};

// ========= handlers =========

/**
 * POST /api/stripe/accounts
 * Create a Stripe Express connected account for a DJ.
 */
export const create_account = async (
  request: FastifyRequest<{ Body: CreateAccountBody }>,
  reply: FastifyReply
) => {
  const { displayName, country, email } = request.body;
  try {
    const account = await stripe.accounts.create({
      type: "express",
      country,
      email,
      business_profile: { name: displayName },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    reply
      .code(httpStatusMap.created)
      .send({ account: { id: account.id, display_name: displayName } });
  } catch (error: any) {
    reply
      .code(httpStatusMap.internalServerError)
      .send({ error: error.message ?? "Failed to create account" });
  }
};

/**
 * GET /api/stripe/accounts/:accountId
 * Retrieve a DJ's account status and derived onboarding flags.
 */
export const get_account_status = async (
  request: FastifyRequest<{ Params: AccountIdParam }>,
  reply: FastifyReply
) => {
  const { accountId } = request.params;
  try {
    const account = await stripe.accounts.retrieve(accountId);
    const onboardingComplete = account.details_submitted === true;
    const readyToReceivePayments =
      account.capabilities?.transfers === "active";

    reply.code(httpStatusMap.ok).send({
      account,
      onboardingComplete,
      readyToReceivePayments,
    });
  } catch (error: any) {
    reply
      .code(httpStatusMap.internalServerError)
      .send({ error: error.message ?? "Failed to retrieve account" });
  }
};

/**
 * POST /api/stripe/account-links
 * Generate a short-lived Stripe-hosted onboarding URL for a DJ.
 */
export const get_onboarding_link = async (
  request: FastifyRequest<{ Body: CreateAccountLinkBody }>,
  reply: FastifyReply
) => {
  const { accountId, returnUrl, refreshUrl } = request.body;
  try {
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });
    reply.code(httpStatusMap.ok).send({ url: link.url });
  } catch (error: any) {
    reply
      .code(httpStatusMap.internalServerError)
      .send({ error: error.message ?? "Failed to create onboarding link" });
  }
};

/**
 * POST /api/stripe/products
 * Create a product + price tier (e.g. "1 Song Request — €2.99").
 * Amount is in major currency units (e.g. 2.99); converted to cents internally.
 */
export const create_product = async (
  request: FastifyRequest<{ Body: CreateProductBody }>,
  reply: FastifyReply
) => {
  const { name, description, amount, currency, connectedAccountId } =
    request.body;
  try {
    const product = await stripe.products.create({
      name,
      description: description || undefined,
      active: true,
      metadata: {
        dj_product: "true",
        connected_account_id: connectedAccountId,
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amount * 100),
      currency,
    });

    // Return product with default_price expanded inline to match the client type
    reply.code(httpStatusMap.created).send({
      product: { ...product, default_price: price },
      price,
    });
  } catch (error: any) {
    reply
      .code(httpStatusMap.internalServerError)
      .send({ error: error.message ?? "Failed to create product" });
  }
};

/**
 * GET /api/stripe/products?connectedAccountId=acct_xxx
 * List active DJ products. Filter by DJ when connectedAccountId is provided.
 */
export const list_products = async (
  request: FastifyRequest<{ Querystring: ListProductsQuery }>,
  reply: FastifyReply
) => {
  const { connectedAccountId } = request.query;
  try {
    const params: Stripe.ProductListParams = {
      active: true,
      expand: ["data.default_price"],
    };
    if (connectedAccountId) {
      // Stripe doesn't support filtering by metadata directly in list();
      // we filter client-side after fetching.
    }

    const result = await stripe.products.list(params);
    const products = connectedAccountId
      ? result.data.filter(
          (p) => p.metadata?.connected_account_id === connectedAccountId
        )
      : result.data;

    reply.code(httpStatusMap.ok).send({ products });
  } catch (error: any) {
    reply
      .code(httpStatusMap.internalServerError)
      .send({ error: error.message ?? "Failed to list products" });
  }
};

/**
 * GET /api/stripe/balance/:accountId
 * Get available + pending balance for a DJ's connected account.
 * Amounts are returned in major currency units (not cents).
 */
export const get_payout_balance = async (
  request: FastifyRequest<{ Params: AccountIdParam }>,
  reply: FastifyReply
) => {
  const { accountId } = request.params;
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    });
    reply.code(httpStatusMap.ok).send({
      available: balance.available.map((b) => ({
        amount: b.amount / 100,
        currency: b.currency,
      })),
      pending: balance.pending.map((b) => ({
        amount: b.amount / 100,
        currency: b.currency,
      })),
    });
  } catch (error: any) {
    reply
      .code(httpStatusMap.internalServerError)
      .send({ error: error.message ?? "Failed to retrieve balance" });
  }
};

/**
 * POST /api/stripe/payout
 * Initiate a manual withdrawal from the DJ's settled balance to their bank.
 * Amount is in major currency units; converted to cents internally.
 */
export const request_payout = async (
  request: FastifyRequest<{ Body: RequestPayoutBody }>,
  reply: FastifyReply
) => {
  const { accountId, amount, currency } = request.body;
  try {
    const payout = await stripe.payouts.create(
      { amount: Math.round(amount * 100), currency },
      { stripeAccount: accountId }
    );
    reply.code(httpStatusMap.created).send({
      payout: {
        id: payout.id,
        status: payout.status,
        amount: payout.amount / 100,
      },
    });
  } catch (error: any) {
    reply
      .code(httpStatusMap.internalServerError)
      .send({ error: error.message ?? "Failed to create payout" });
  }
};

/**
 * POST /api/stripe/checkout
 * Create a Stripe Checkout Session (destination charge to the DJ's account).
 */
export const create_checkout_session = async (
  request: FastifyRequest<{ Body: CreateCheckoutBody }>,
  reply: FastifyReply
) => {
  const {
    priceId,
    connectedAccountId,
    applicationFeePercent,
    successUrl,
    cancelUrl,
  } = request.body;
  try {
    let applicationFeeAmount: number | undefined;

    if (applicationFeePercent) {
      const price = await stripe.prices.retrieve(priceId);
      applicationFeeAmount = Math.round(
        ((applicationFeePercent / 100) * (price.unit_amount ?? 0))
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: connectedAccountId },
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
