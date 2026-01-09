FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Cài typescript globally
RUN npm install -g typescript

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Cài dependencies
RUN npm install --include=dev

RUN npx prisma generate

COPY . .

# Build TypeScript dùng tsc global
RUN tsc

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
