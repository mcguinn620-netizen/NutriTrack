# NetNutrition Category Expansion Reverse-Engineering Runbook

This runbook adds a reproducible Playwright capture flow for tracing category expansion (`Menu/ToggleCourseItems`) and navbar state (`UpdateNavBar`) without modifying product code paths.

## Command

```bash
npm run capture:netnutrition
```

Optional environment variables:

- `NETNUTRITION_URL` (default: `https://netnutrition.bsu.edu/NetNutrition/1`)
- `NETNUTRITION_CAPTURE_DIR` (default: `artifacts/netnutrition-capture/<timestamp>`)
- `HEADLESS=false` to watch interactions.

## Saved artifacts

The script writes:

- `page-before-click.html`
- `page-after-click.html`
- `clicked-category-dom.json`
- `network-requests.json`
- `network-responses.json`
- `togglecourseitems-requests.json`
- `togglecourseitems-responses.json`
- `updatenavbar-responses.json`
- `responses/*.txt` (full raw response bodies)

## What it captures

- XHR/fetch request metadata (URL, method, selected headers, post body).
- Response metadata + response body previews.
- Raw full response bodies for `ToggleCourseItems`, `UpdateNavBar`, and related menu/unit requests.
- Category toggle DOM snippets and identifiers (`courseOid`, `course0id`, `courseId`, `CourseOid`, `CourseID`) if present.

## Notes

- The script uses session-first navigation heuristics (unit selection, menu selection, then category toggle) and is resilient to school-specific NetNutrition markup variants.
- It is designed for evidence capture only and does **not** change app/frontend behavior.
