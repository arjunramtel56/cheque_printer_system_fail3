# Performance Baseline

Last measured: 2026-09-22

## Methodology

These numbers are captured using Chrome DevTools Performance panel + Lighthouse 12 via `lighthouse-cli`.
All runs performed on a clean Chrome 130 profile with network throttling set to "Fast 3G" (1.6 Mbps down, 750 Kbps up, 40ms RTT) for realism.

Run your own baseline with:

```bash
npx lighthouse http://localhost:3000/en/dashboard/print --output=json --output-path=./perf-lighthouse.json
```

## Results

### Core Web Vitals (Lighthouse)

| Metric                         | Value | Score   |
| ------------------------------ | ----- | ------- |
| LCP (Largest Contentful Paint) | - ms  | - / 100 |
| FID (First Input Delay)        | - ms  | - / 100 |
| CLS (Cumulative Layout Shift)  | -     | - / 100 |
| LCP (mobile)                   | - ms  | - / 100 |
| TBT (Total Blocking Time)      | - ms  | - / 100 |

### Lighthouse Score

| Category       | Score   |
| -------------- | ------- |
| Performance    | - / 100 |
| Accessibility  | - / 100 |
| Best Practices | - / 100 |
| SEO            | - / 100 |

### Cheque Print Workflow Timings

| Step                               | Duration | Notes                                     |
| ---------------------------------- | -------- | ----------------------------------------- |
| Page load (`/dashboard/print`)     | - ms     | TTFB to first paint                       |
| Preview render (template + fields) | - ms     | Time to fully render `<ChequePreview>`    |
| Print dialog open                  | - ms     | `window.print()` call to dialog appearing |
| PDF export (single cheque)         | - ms     | Server-side `@react-pdf/renderer` render  |
| Template save (admin)              | - ms     | POST to `/api/admin/templates` round-trip |

## How to re-measure

1. Start the dev server: `npm run dev`
2. Open Chrome DevTools → Performance tab
3. Record a fresh page load + interaction (select bank, type amount, click Print)
4. Note the timings above
5. Run Lighthouse: `npx lighthouse http://localhost:3000/en/dashboard/print --view`
6. Update this file with new numbers

## Notes

- These are **baseline** numbers. Any change to template rendering, PDF generation, or i18n must not regress these values by more than 10%.
- Dev-mode runs are slower than production. For production benchmarking, build first: `npm run build && npm start`.
