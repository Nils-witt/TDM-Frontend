.PHONY: all build dev preview lint test fmt fmt-check docker clean help

all: lint fmt-check test build

node_modules: package.json package-lock.json
	npm ci
	@touch node_modules

## build: Type-check and build the SPA into dist/
build: node_modules
	npm run build

## dev: Run the Vite dev server (API at VITE_API_BASE_URL, see .env.development)
dev: node_modules
	npm run dev

## preview: Serve the built dist/ locally
preview: build
	npm run preview

## lint: Lint with oxlint
lint: node_modules
	npm run lint

## test: Run the unit tests (Vitest)
test: node_modules
	npm test

## fmt: Format with Prettier
fmt: node_modules
	npm run format

## fmt-check: Check formatting without writing
fmt-check: node_modules
	npm run format:check

## docker: Build the nginx image (API URL from a mounted config.json; API_BASE_URL is an optional fallback)
docker:
	docker build --build-arg VITE_API_BASE_URL=$(API_BASE_URL) -t universam-frontend .

## clean: Remove build output
clean:
	rm -rf dist

## help: Show this help
help:
	@sed -n 's/^## //p' $(MAKEFILE_LIST) | column -t -s ':'
