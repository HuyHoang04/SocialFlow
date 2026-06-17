FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .

# Khai bao cac bien can thiet luc Build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FACEBOOK_APP_ID
ARG NEXT_PUBLIC_UNSPLASH_APP_ID
ARG NEXT_PUBLIC_UNSPLASH_ACCESS_KEY

# Chuyen ARG thanh ENV de Next.js doc duoc luc build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_FACEBOOK_APP_ID=$NEXT_PUBLIC_FACEBOOK_APP_ID
ENV NEXT_PUBLIC_UNSPLASH_APP_ID=$NEXT_PUBLIC_UNSPLASH_APP_ID
ENV NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=$NEXT_PUBLIC_UNSPLASH_ACCESS_KEY

RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/.next/standalone ./    
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]