# Monorepo-aware build: context is the repo ROOT (see docker-compose api.build.context).
FROM node:20-slim AS build
WORKDIR /repo
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install workspace deps (api + db package).
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
RUN npm install

# Source + generate Prisma client, then build TS.
COPY packages/db ./packages/db
COPY apps/api ./apps/api
COPY content ./content
RUN npm --workspace packages/db run generate
RUN npm --workspace apps/api run build

FROM node:20-slim AS run
WORKDIR /repo
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json /repo/package-lock.json ./
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/content ./content
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
EXPOSE 4000
CMD ["sh", "-c", "npm run db:migrate:deploy && npm run db:seed && node apps/api/dist/server.js"]
