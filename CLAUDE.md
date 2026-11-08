# universamFrontend

Vite + React 19 (TypeScript) single-page application. Its base structure is copied from `missioncontroller/web`, without server-sent events or domain widgets. It is the frontend of `universalGoApi`, which runs on a separate origin.

## Layout

- `src/main.tsx` renders `app/App.tsx`, the auth gate. Once signed in it renders `app/Shell.tsx`: `ResourceProvider` → `LayoutProvider` → `DashboardProvider` → `WidgetWindows` → `Nav` + `Dashboard`.
- Auth (`src/auth/session.ts`, oidc-client-ts):
  1. The login page offers Authentik or a client certificate. The certificate button calls `GET /api/v1/whoami` without a token on the mTLS API URL; a 200 means an mTLS reverse proxy authenticated the certificate (`mode: 'proxy'`), and that URL is used from then on. The choice is kept in sessionStorage (`universam.clientCertificate`) so a reload re-checks it instead of showing the login page; Log Out and any 401 forget it. The mTLS URL is never contacted without the button, since a browser may prompt for a certificate.
  2. Otherwise it uses the Authentik authorization code + PKCE flow, configured from `GET /auth/config`. The redirect URI is `<origin>/callback`, and tokens are kept in sessionStorage.
  3. Tokens are renewed with the refresh token, which needs the `offline_access` scope in the API's `OIDC_SCOPES`. Without one, the session ends when the token expires.
  4. Logging out uses the provider's `end_session_endpoint`.
  5. Any 401 shows the login page again.
- `useSession()` (`app/session.ts`) returns `{ principal, mode, logout }`.
- `src/api/`: `client.ts` (`request` prefixes the API URL from `/config.json`, loaded by `main.tsx` before rendering: `apiBaseUrl` for OIDC (else `VITE_API_BASE_URL`), `mtlsApiBaseUrl` for client certificates (else `apiBaseUrl`); sends `credentials: 'include'` and the Bearer token, throws `ApiError` with the RFC 9457 `detail`), `auth.ts` (`/auth/config`, `/api/v1/whoami`), `resource.ts` (`useResource(path)`: a shared, coalescing cache that loads when first shown and on `reload()`, with no change events), `setting.ts`.
- `src/components/`: generic UI (`Alert`, `Spinner`, `ConfirmDialog`, `SuggestInput`, `form/`, `menu/`, `symbols/`, `widgetWindow/`).
- `src/nav/`: macOS-style menu bar (`Nav.tsx`), `NavMenuItem` with `action` / `widget` / `href`, actions in `navActions.ts`, keyboard shortcuts in `shortcuts.ts`, the View menu (layouts), and the About, Clock, Fullscreen and channel indicators.
- `src/pages/dashboard/`: the layout framework. The built-in layout is in `dashboard.json`. Layouts are kept in localStorage (`layoutStore.ts`, `universam.layouts`; the API has no layout endpoints), as is this browser's default layout. There is an edit mode with undo/redo and import/export, multi-monitor arrangements, and channels (BroadcastChannel) that share the `selection` event (`selectedId` in `dashboardContext`).
- `src/pages/dashboard/widgets/`: `registry.ts` (metadata plus a `lazy()` component per widget), `widget.ts`, `widgetOptions.ts`, `widgetCategories.ts`. `Example/` is the template for new widgets.
- `src/styles/`: design tokens and global partials, pulled in by `src/index.scss`. Components use `*.module.scss`.
- `@/` is an alias for `src/`.

## Conventions

- Context: `createContext<T | null>(null)`, read with `use()` in a hook that throws outside its provider.
- Comments explain why. Don't restate names.
- Adding a widget: create `widgets/<Name>/<Name>.tsx` (default export taking `WidgetProps`), register it in `registry.ts`, and optionally add a `NavMenuItem` and shortcut.

## Commands

- `make dev`: Vite dev server on port 5173 (fixed, because the redirect URI and CORS depend on it). The API is at `VITE_API_BASE_URL` (`.env.development`: `http://localhost:8080`).
- Authentik: register `http://localhost:5173/callback` (and the production `<origin>/callback`) as redirect URIs. Add the SPA origin to the API's `CORS_ALLOWED_ORIGINS`.
- `make build`: `tsc -b && vite build` into `dist/`.
- `make lint` (oxlint), `make fmt` / `make fmt-check` (Prettier, `.prettierrc.json`).
- `make docker API_BASE_URL=https://api.example.com`: nginx image that serves `dist/` and falls back to `index.html`. Set the API origin at runtime by mounting a `config.json` (`{"apiBaseUrl": "https://api.example.com", "mtlsApiBaseUrl": "https://mtls.api.example.com"}`) at `/usr/share/nginx/html/config.json`. `API_BASE_URL` is an optional build-time fallback.
