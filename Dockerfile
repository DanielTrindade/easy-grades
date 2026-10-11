# syntax=docker/dockerfile:1.7

# ---- build: install, test-free build of web + api, then a prod-only deploy of the api ----
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @easy-grades/web build && pnpm --filter @easy-grades/api build
RUN pnpm --filter @easy-grades/api deploy --legacy --prod /out

# ---- runtime: only the bundled server, its prod deps and the static web build ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    STATIC_DIR=/app/public
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
COPY --from=build --chown=node:node /repo/apps/web/dist ./public
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "dist/server.js"]
