import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  create_account,
  get_account_status,
  get_onboarding_link,
  create_product,
  list_products,
  get_payout_balance,
  request_payout,
  create_checkout_session,
} from "../handlers/stripe.handlers";
import {
  accountIdParam,
  createAccountSchema,
  createAccountLinkSchema,
  createProductSchema,
  createCheckoutSessionSchema,
  requestPayoutSchema,
  listProductsQuerySchema,
  createAccountResponseSchema,
  accountStatusResponseSchema,
  accountLinkResponseSchema,
  createProductResponseSchema,
  listProductsResponseSchema,
  balanceResponseSchema,
  payoutResponseSchema,
  checkoutSessionResponseSchema,
  errorResponseSchema,
} from "../schemas/stripe.schema";

/**
 * DJ Stripe routes - Firebase auth required (djRoutes applied at scope level in app.router.ts).
 *
 * POST   /api/stripe/accounts              - create connected account
 * GET    /api/stripe/accounts/:accountId   - get account status
 * POST   /api/stripe/account-links         - get onboarding link
 * POST   /api/stripe/products              - create product + price
 * GET    /api/stripe/products              - list products
 * GET    /api/stripe/balance/:accountId    - get payout balance
 * POST   /api/stripe/payout               - request payout
 * POST   /api/stripe/checkout             - create checkout session
 */
export default (
  router: FastifyInstance,
  opts: FastifyPluginOptions,
  done: () => void
) => {
  router.post(
    "/accounts",
    {
      schema: {
        body: createAccountSchema,
        response: {
          201: createAccountResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    create_account
  );

  router.get(
    "/accounts/:accountId",
    {
      schema: {
        params: accountIdParam,
        response: {
          200: accountStatusResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    get_account_status
  );

  router.post(
    "/account-links",
    {
      schema: {
        body: createAccountLinkSchema,
        response: {
          200: accountLinkResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    get_onboarding_link
  );

  router.post(
    "/products",
    {
      schema: {
        body: createProductSchema,
        response: {
          201: createProductResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    create_product
  );

  router.get(
    "/products",
    {
      schema: {
        querystring: listProductsQuerySchema,
        response: {
          200: listProductsResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    list_products
  );

  router.get(
    "/balance/:accountId",
    {
      schema: {
        params: accountIdParam,
        response: {
          200: balanceResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    get_payout_balance
  );

  router.post(
    "/payout",
    {
      schema: {
        body: requestPayoutSchema,
        response: {
          201: payoutResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    request_payout
  );

  router.post(
    "/checkout",
    {
      schema: {
        body: createCheckoutSessionSchema,
        response: {
          201: checkoutSessionResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    create_checkout_session
  );

  done();
};
