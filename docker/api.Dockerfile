FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter api...
COPY tsconfig.base.json ./
COPY apps/api apps/api
RUN pnpm --filter api build
RUN pnpm --filter api deploy --prod /out

FROM node:20-alpine
WORKDIR /app
COPY --from=build /out .
COPY --from=build /repo/apps/api/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main.js"]