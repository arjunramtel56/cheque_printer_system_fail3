# Run doc — Reactify Cheque Printer System (preview)

This project is a self-contained Next.js 16 App Router app. It is **frontend-only**:
there are no API routes, no database, no environment variables and no secrets
required to boot it. Verify that before adding env handling to a new worktree.

## 1. Reproduce the uncommitted artifacts

A fresh checkout needs only the dependency tree:

```bash
npm install
```

Notes:
- Use `npm` (the repo ships `package-lock.json`); do not switch package managers.
- **No `.env` / `.env.local` is needed.** The app reads no environment variables.
  Do not copy env files from the main checkout "just in case". If a future change
  introduces env vars, copy the file from the main checkout (**copy, never
  symlink**, values such as ports may need adapting per worktree) and record the
  *procedure* here — never the values.
- Node 22+ is expected (Next.js 16). The suite runs through `tsx`, already a dev
  dependency.
- `.next/` and `node_modules/` are gitignored build artifacts; reinstall/rebuild
  rather than committing them.

## 2. Run the server

Default port is **3000** (`next dev` with no override). Use it when free:

```bash
npm run dev
```

### Environment gotcha: `PORT=0` is set by the host

The preview host injects `PORT=0`, so a plain `npm run dev` hands the port choice
to Next.js and the app comes up on a **random** port (it landed on 60672 once).
Pin the port explicitly in the detached launch:

```powershell
$env:PORT='3000'
```

or run `npx next dev -p 3000`.

### Preview host must be `localhost`, not `127.0.0.1`

Next.js 16 dev **blocks cross-origin dev resources** for unlisted origins. Loading
the app at `http://127.0.0.1:3000/` (a different origin than the dev server's own
`localhost:3000`) produces:

- `403` on `/_nextjs_font/geist-latin.woff2`
- `WebSocket connection to 'ws://127.0.0.1:3000/_next/hmr' failed: ERR_INVALID_HTTP_RESPONSE`
- **and, worst of all, silently no hydration** — the server-rendered HTML looks
  correct and the page never throws, but no React tree is attached, so every
  control stays inert.

Symptoms of the un-hydrated state: field selects/inputs never enable after
choosing a bank, and React's `__reactFiber$*` / `__reactProps$*` properties are
absent from DOM nodes (`document` still carries `_reactListening*` from the dev
overlay, so it looks alive — check the *element*, not the document).

Fix used here: **register the preview at `http://localhost:3000/`.** No source
change required. The alternative, if a `127.0.0.1` origin is ever needed, is to
add it in `next.config.mjs` as Next.js itself suggests:

```js
allowedDevOrigins: ['127.0.0.1'],
```

Confirm hydration after any host change:

```js
Object.getOwnPropertyNames(document.querySelector('#template-select'))
  .filter(k => k.startsWith('__react'))   // must be non-empty
```

### After moving or adding a route: run `next typegen` or `tsc` fails

`tsconfig.json` includes `.next/types/**/*.ts`. Those route type files are
**generated**, and Next.js only rewrites them on a dev-server start or an explicit
typegen — a *running* dev server keeps serving the stale ones. So immediately
after moving/renaming/adding an `app/**/page.tsx` or `layout.tsx`, `npm run
typecheck` fails with errors that look like this and are **not real code errors**:

```
.next/types/validator.ts(51,39): error TS2307: Cannot find module '../../app/admin/page.js'
```

Fix (no build required, safe while the dev server runs):

```bash
npx next typegen
```

Observation window: the stale validator can persist for several minutes after
the move, so "re-run tsc and hope" is not a strategy.

### Replacing a registered preview stops the running server

`register_preview` with `replace: true` released the old preview **and killed the
dev server process**. After a replace, restart the server and register the new
pid.

### Detached (Windows / PowerShell)

`Start-Process` does not resolve shell shims, so name the executable exactly and
send stdout and stderr to **different** files:

```powershell
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput '.freebuff\preview.log' -RedirectStandardError '.freebuff\preview.log.err' -WindowStyle Hidden -PassThru).Id"
```

Then confirm it survived and is answering:

```powershell
powershell -NoProfile -Command "Get-Process -Id <pid>"
```

Wait for the port to respond before registering the preview:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
```

### Port selection

Prefer 3000. If it is taken, pick a free port (and set both `PORT` and the
registered URL to match):

```bash
npx next dev -p 3001
```

### Known console noise (pre-existing, not preview-related)

- Two React warnings on print render: `React does not recognize the data-calX /
data-calY prop on a DOM element`. Source: `components/Workspace.tsx` (camelCase
  `data-calX`/`data-calY` JSX attributes on the hidden print wrapper) and they are
  asserted verbatim in `tests/part4-print-workflow.test.mjs`, so a fix must
  update that test in the same pass. Cosmetic only — the attributes still land in
  the DOM as lowercase, and printing is unaffected.

### Routes worth previewing

| Page | URL |
| ---- | --- |
| Guided cheque workspace | `/` |
| Bank directory | `/banks` |
| Deep-linked workspace | `/banks/[bank]/cheque/[template]` |
| Admin login (demo gate) | `/admin/login` |
| Admin dashboard (gated) | `/admin` |
| Admin bank management | `/admin/banks` |
| Template list / workbench | `/admin/templates`, `/admin/templates/[id]` |
| Calibration records | `/admin/calibration` |

Demo admin password: `admin` (client-side gate only — see the README).

The admin area is split by a route group: `/admin/login` sits **outside** the
`(dashboard)` group so it can render while signed out. If it ever renders blank,
the gate has been moved back over it — `tests/admin-access.test.mjs` catches that.

## 3. Other useful commands

```bash
npm run verify      # typecheck + the full suite — use this one
npm run typecheck   # tsc --noEmit (see the typegen note above)
npm test            # tsx test suite (11 suites)
```
