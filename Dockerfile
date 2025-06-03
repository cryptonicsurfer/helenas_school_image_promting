# Dockerfile (för Produktion)

# ---- Builder Stage ----
FROM node:22-alpine AS builder
LABEL stage=builder

# Installera byggberoenden för better-sqlite3 och andra native moduler
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

WORKDIR /app

# Kopiera package.json och package-lock.json
COPY package*.json ./

# Installera alla beroenden (inklusive devDependencies som behövs för bygget)
# Använd npm ci för reproducerbara byggen om package-lock.json är tillförlitlig
RUN npm ci

# Kopiera resten av applikationens källkod
# Se till att .dockerignore är korrekt konfigurerad
COPY . .

# Bygg Next.js-applikationen
# GEMINI_API_KEY kan behövas vid byggtid om Genkit/Next.js använder den under bygget.
# Om så är fallet, måste den skickas som ett build-arg. För nu antar vi att den bara behövs vid körtid.
RUN npm run build

# Ta bort utvecklingsberoenden från node_modules
RUN npm prune --omit=dev


# ---- Runner Stage ----
FROM node:22-alpine AS runner

WORKDIR /app

# Skapa en icke-root användare och grupp
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Kopiera endast nödvändiga artefakter från builder-steget
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
# Om package-lock.json behövs för `npm start` eller runtime-skript, kopiera den också.
# COPY --from=builder --chown=nextjs:nodejs /app/package-lock.json ./package-lock.json

# Skapa kataloger för persistent data (volymer kommer att monteras här)
# Se till att dessa kataloger ägs av icke-root användaren
RUN mkdir -p /app/data /app/public/images && \
    chown -R nextjs:nodejs /app/data /app/public/images

# Byt till icke-root användaren
USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
# Next.js använder automatiskt PORT 3000 om inte PORT env var specificeras

CMD ["npm", "start"]