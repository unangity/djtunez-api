import { FastifyReply, FastifyRequest } from "fastify";
import { httpStatusMap } from "../utils/http-status-map";
import { Role } from "../constants";

export const authPreHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  if (!request.authenticatedUser)
    return reply
      .code(httpStatusMap.unauthorized)
      .send({ message: "Unauthorized" });
  if (
    request.authenticatedUser.role !== Role.admin &&
    request.authenticatedUser.needsPasswordChange && // TODO: Ensure undefined is handled
    !request.url.startsWith("/api/enable-staff/")
  )
    return reply.code(httpStatusMap.forbidden).send({ message: "Forbidden" });
  const { cinema_id } = request.params as { cinema_id: string };
  if (cinema_id === undefined) return;
  if (
    request.authenticatedUser.role !== Role.admin &&
    request.authenticatedUser.cinema !== cinema_id
  )
    return reply.code(httpStatusMap.forbidden).send({ message: "Forbiddenww" });
};
