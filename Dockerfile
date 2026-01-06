FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

FROM base AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV PORT=3000

EXPOSE 3000

CMD ["bun", "run", "src/devA.ts"]
