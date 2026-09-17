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

Prefer 3000. If it is taken, pick a free port and pass it explicitly so the
choice is recorded:

```bash
npx next dev -p 3001
```

### Routes worth previewing

| Page | URL |
| ---- | --- |
| Guided cheque workspace | `/` |
| Admin dashboard (demo gate) | `/admin` |
| Admin login | `/admin/login` |
| Bank template editor | `/admin/templates` |

## 3. Other useful commands

```bash
npm run typecheck   # tsc --noEmit
npm test            # tsx test suite (validation, print flow, verification)
```
