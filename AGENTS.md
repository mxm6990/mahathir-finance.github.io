# AGENTS.md

## Cursor Cloud specific instructions

This is a **static HTML site** (GitHub Pages) with no build system, no package manager, and no runtime dependencies beyond a web browser.

### Running the site

Serve the site locally with Python's built-in HTTP server:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser. The single `index.html` file loads Bootstrap 5.3.0 via CDN.

### Lint / Test / Build

- **Lint**: No linter is configured. For HTML validation, you can use an external validator or install one ad-hoc.
- **Tests**: No automated tests exist.
- **Build**: No build step is required — the site is plain static HTML.

### Notes

- Bootstrap CSS is loaded from `cdn.jsdelivr.net`. Internet access is needed for full styling; without it the page still renders but unstyled.
- The "Launch Tool" button on the Amortization Calculator card is non-functional (placeholder — "Coming soon...").
