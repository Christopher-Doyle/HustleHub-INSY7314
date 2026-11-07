FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S hustlehub && adduser -S -G hustlehub hustlehub
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=hustlehub:hustlehub src ./src
COPY --chown=hustlehub:hustlehub package.json ./
USER hustlehub
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s CMD wget --no-check-certificate -qO- https://localhost:4000/api/health || exit 1
CMD ["node","src/server.cjs"]
