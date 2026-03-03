# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Build-time env vars (baked into the bundle)
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_AUTH_URL=${VITE_API_BASE_URL}
ENV VITE_BOOKING_URL=${VITE_API_BASE_URL}
ENV VITE_PRICING_URL=${VITE_API_BASE_URL}
ENV VITE_DRIVER_URL=${VITE_API_BASE_URL}
ENV VITE_RIDE_URL=${VITE_API_BASE_URL}
ENV VITE_NOTIFICATION_URL=${VITE_API_BASE_URL}
ENV VITE_GEO_URL=${VITE_API_BASE_URL}
ENV VITE_PAYMENT_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback: redirect 404 to index.html
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' \
    > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
