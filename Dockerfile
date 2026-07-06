# Production image — Vite build served by nginx (~50MB final).
#
# Vite env vars are BUILD-time (baked into the JS bundle), so pass them as
# build args:
#
#   docker build \
#     --build-arg VITE_API_URL=https://api.example.com/api \
#     --build-arg VITE_GRAPHQL_URL=https://api.example.com/api/graphql \
#     --build-arg VITE_APP_NAME=MyApp \
#     -t frontend-template .
#   docker run -p 8080:80 frontend-template

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

ARG VITE_API_URL=http://localhost:3005/api
ARG VITE_GRAPHQL_URL=http://localhost:3005/api/graphql
ARG VITE_AUTH_STRATEGY=jwt
ARG VITE_APP_NAME=FRONTEND
ARG VITE_SENTRY_DSN=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL \
    VITE_AUTH_STRATEGY=$VITE_AUTH_STRATEGY \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN

COPY . .
RUN pnpm build

FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
