# distroless Dockerfile for djtunez-api
FROM node:20.17-alpine3.20
WORKDIR /usr/src/app
ENV NODE_ENV production

COPY ./src/package*.json ./

RUN npm ci --omit=dev

COPY ./src/dist .

EXPOSE $PORT

CMD ["npm", "start"]