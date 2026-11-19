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
# The build the About dialog shows; .git is not in the build context.
ARG APP_VERSION=
ARG APP_COMMIT=
RUN VITE_API_BASE_URL=$VITE_API_BASE_URL APP_VERSION=$APP_VERSION APP_COMMIT=$APP_COMMIT npm run build

# Serve dist/ with a fallback to index.html for client-side routes.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-headers.conf /etc/nginx/snippets/headers.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80
