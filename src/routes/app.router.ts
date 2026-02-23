import { FastifyInstance, FastifyPluginOptions } from "fastify";
import djtunezRoutes from "./djtunez.routes";
import spotifyRoutes from "./spotify.routes";
import paymentRoutes from "./payment.routes";
import stripeRoutes from "./stripe.routes";
import userRoutes from "./user.routes";
import { djRoutes } from "../hooks/role.access";
import {
  joiSchemaCompiler,
  joiSerializerCompiler,
} from "../hooks/schema.validator";

/**
 * Root router — the only router registered in app.ts.
 *
 * /api/djtunez/*  — public — event/DJ info + song queue writes
 * /api/spotify/*  — public — Spotify token exchange
 * /api/payment/*  — public — Stripe PaymentIntent creation
 * /api/user/*     — Firebase auth required — DJ self-service (e.g. account deletion)
 * /api/stripe/*   — Firebase auth + role=dj required — Stripe Connect management
 */
export default (
  router: FastifyInstance,
  opts: FastifyPluginOptions,
  done: (err?: Error) => void
) => {
  const publicScope = (fn: (s: FastifyInstance) => void) =>
    (scope: FastifyInstance, _: FastifyPluginOptions, next: () => void) => {
      scope
        .setValidatorCompiler(joiSchemaCompiler)
        .setSerializerCompiler(joiSerializerCompiler);
      fn(scope);
      next();
    };

  //  Public routes (no auth)
  router.register(publicScope((s) => s.register(djtunezRoutes)), { prefix: "/djtunez" });
  router.register(publicScope((s) => s.register(spotifyRoutes)), { prefix: "/spotify" });
  router.register(publicScope((s) => s.register(paymentRoutes)), { prefix: "/payment" });

  //  User self-service routes (Firebase auth, no role check)
  const djScope = (fn: (s: FastifyInstance) => void) =>
    (scope: FastifyInstance, _: FastifyPluginOptions, next: () => void) => {
      scope
        .addHook("onRequest", djRoutes)
        .setValidatorCompiler(joiSchemaCompiler)
        .setSerializerCompiler(joiSerializerCompiler);
      fn(scope);
      next();
    };
  router.register(djScope((s) => s.register(userRoutes)), { prefix: "/user" });
  router.register(djScope((s) => s.register(stripeRoutes)), { prefix: "/stripe" });
  done();
};
