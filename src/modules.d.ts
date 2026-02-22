import { AuthenticatedUser } from "./constants";
declare module "fastify" {
  interface FastifyRequest {
    authenticatedUser: AuthenticatedUser;
  }
}

export * from "fastify";
