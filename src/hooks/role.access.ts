import { FastifyReply, FastifyRequest } from "fastify";
import { httpStatusMap } from "../utils/http-status-map";
import { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier";
import DB from "../db";
import { Role } from "../constants";

const db = new DB();
const dbAuth = db.auth;

export const djRoutes = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  await protectedRoutes(request, reply, [Role.dj]);
};

export const protectedRoutes = async (
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: Role[]
) => {
  const authHeader = request.headers.authorization;

  if (authHeader === undefined) {
    return reply.code(httpStatusMap.unauthorized).send({
      success: false,
      data: "Unauthorized",
    });
  }

  const token = authHeader.split(" ")[1];
  let decodedToken: DecodedIdToken;

  try {
    decodedToken = await dbAuth.verifyToken(token);
  } catch (err) {
    return reply.code(httpStatusMap.unauthorized).send({
      success: false,
      data: "Unauthorized",
    });
  }

  try {
    const authUser = await dbAuth.getUser(decodedToken.uid);

    if (
      !authUser.customClaims ||
      !allowedRoles.includes(authUser.customClaims.role)
    ) {
      return reply.code(httpStatusMap.unauthorized).send({
        success: false,
        data: "Unauthorized",
      });
    }

    request.authenticatedUser = {
      uid: authUser.uid,
      role: authUser.customClaims.role as Role,
      needsPasswordChange: authUser.customClaims.needsPasswordChange as boolean,
      email: authUser.email,
      name: authUser.displayName,
    };
  } catch (err) {
    return reply.code(httpStatusMap.unauthorized).send({
      success: false,
      data: "Unauthorized",
    });
  }
};
