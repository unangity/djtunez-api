import { FastifyInstance, FastifyPluginOptions } from "fastify";
import djtunezRoutes from "./djtunez.routes";
import stripeRoutes from "./stripe.routes";
import { djRoutes } from "../hooks/role.access";
import {
  joiSchemaCompiler,
  joiSerializerCompiler,
} from "../hooks/schema.validator";

/**
 * Root router — the only router registered in app.ts.
 *
 * /api/djtunez/*  — public, no auth
 * /api/stripe/*   — DJ Firebase auth required
 */
export default (
  router: FastifyInstance,
  opts: FastifyPluginOptions,
  done: (err?: Error) => void
) => {
  // ── Public DJTunez routes (fans, no auth) ────────────────────────────────
  router.register(
    (scope, _, next) => {
      scope
        .setValidatorCompiler(joiSchemaCompiler)
        .setSerializerCompiler(joiSerializerCompiler);
      scope.register(djtunezRoutes);
      next();
    },
    { prefix: "/djtunez" }
  );

  // ── DJ Stripe routes (Firebase auth, role = dj) ──────────────────────────
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
