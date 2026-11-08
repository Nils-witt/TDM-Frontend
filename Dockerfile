# syntax=docker/dockerfile:1

# Build the SPA into dist/.
FROM --platform=$BUILDPLATFORM node:26-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
# Fallback origin of universalGoApi, baked into the bundle. A config.json
# mounted at /usr/share/nginx/html/config.json overrides it at runtime.
ARG VITE_API_BASE_URL=
RUN VITE_API_BASE_URL=$VITE_API_BASE_URL npm run build

# Serve dist/ with a fallback to index.html for client-side routes.
FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80
