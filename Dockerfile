# --- Build : compile the TypeScript sources ---
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && find dist -name '*.test.js' -delete

# --- Runtime : production dependencies + compiled code only ---
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

# --chown : the files must be readable by the "node" user, whatever the host umask
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node --from=build /app/dist ./dist
# Read at runtime next to dist/ (see src/utils/HandlersPath.ts)
COPY --chown=node:node handlers ./handlers

USER node
CMD ["node", "dist/index.js"]
