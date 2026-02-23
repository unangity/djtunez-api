import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { delete_account } from "../handlers/user.handlers";

/**
 * User self-service routes - Firebase ID token required (verified in handler).
 * No role claim check so any authenticated DJ can delete their own account.
 *
 * DELETE /api/user/me - cascade-delete RTDB data + Firebase Auth account
 */
export default (
  router: FastifyInstance,
  opts: FastifyPluginOptions,
  done: () => void
) => {
  router.delete("", {}, delete_account);
  done();
};
