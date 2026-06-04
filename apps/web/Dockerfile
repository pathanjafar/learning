# Build context is the repo ROOT (see docker-compose web.build.context).
FROM node:20-slim AS build
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/
RUN npm install
COPY apps/web ./apps/web
RUN npm --workspace apps/web run build

FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production
# Next.js standalone output bundles only what's needed to run.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
