import { FastifyInstance, FastifyPluginOptions } from "fastify";
import djtunezRoutes from "./djtunez.routes";
import spotifyRoutes from "./spotify.routes";
import paymentRoutes from "./payment.routes";
import stripeRoutes from "./stripe.routes";
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
 * /api/stripe/*   — DJ Firebase auth required — Stripe Connect management
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

  //  DJ Stripe routes (Firebase auth, role = dj) 
  router.register(
    (scope, _, next) => {
      scope.addHook("onRequest", djRoutes);
      scope
        .setValidatorCompiler(joiSchemaCompiler)
        .setSerializerCompiler(joiSerializerCompiler);
      scope.register(stripeRoutes);
      next();
    },
    { prefix: "/stripe" }
  );

  done();
};
