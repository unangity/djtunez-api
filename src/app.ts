import fastify from "fastify";
import router from "./routes/app.router";
import cors from "@fastify/cors";

const env = process.env.NODE_ENV || "development";
const DEV = env === "development";

const server = fastify();
const port = parseInt(process.env.PORT || "8080");
let host = `http://localhost:${port}`;

if (DEV) {
  const convert = require("joi-to-json");
  server.register(import("@fastify/swagger"), {
    swagger: {
      info: {
        title: "DJTunez API",
        description: "DJTunez backend API",
        version: "1.0.0",
      },
      host: "localhost",
      schemes: ["http"],
      consumes: ["application/json"],
      produces: ["application/json"],
    },
    transform: ({ schema, url }) => {
      const {
        params,
        body,
        querystring,
        headers,
        response,
        ...transformedSchema
      } = schema as any;
      const transformedUrl = url;

      if (params) transformedSchema.params = convert(params);
      if (body) transformedSchema.body = convert(body);
      if (querystring) transformedSchema.querystring = convert(querystring);
      if (headers) transformedSchema.headers = convert(headers);
      if (response) {
        transformedSchema.response = {};
        for (const [statusCode, responseSchema] of Object.entries(response)) {
          transformedSchema.response[statusCode] = convert(responseSchema);
        }
      }

      return { schema: transformedSchema, url: transformedUrl };
    },
  });

  server.register(import("@fastify/swagger-ui"), {
    routePrefix: "/documentation",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (request, reply, next) { next(); },
      preHandler: function (request, reply, next) { next(); },
    },
  });
}

server.register(cors, {
  origin: (origin, cb) => {
    if (DEV) {
      cb(null, true);
      return;
    }
    if (!origin) {
      cb(null, false);
      return;
    }
    const hostname = new URL(origin).hostname;
    if (hostname === "djtunez.com") {
      cb(null, true);
      return;
    }
    cb(new Error("Not allowed"), false);
  },
});

if (process.env.NODE_ENV === "production") {
  host = `https://${process.env.GOOGLE_CLOUD_PROJECT}.ey.r.appspot.com`;
}

server.get("/health", async (request, reply) => {
  reply.code(200).send({ status: "ok" });
});

// All routes registered through app.router.ts
server.register(router, { prefix: "/api" });

// Bind to 0.0.0.0 so the server is reachable from other devices on the
// same network (physical Android/iOS device via WiFi, Firebase emulators, etc.)
server.listen({ port, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`⚡️Server listening at ${host}`);
});
