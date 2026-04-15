# AGENTS.md

## Cursor Cloud specific instructions

This is a **static HTML site** (GitHub Pages) with no build system, no package manager, and no runtime dependencies beyond a web browser.

### Running the site

Serve the site locally with Python's built-in HTTP server:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser.

### Structure

- `index.html` — Personal homepage (dark theme, Inter font via Google Fonts, shared `assets/site.css`).
- `amortization-tracker.html`, `ma-dashboard.html`, `sharpe-ratio.html` — Tool landing pages (placeholders until each tool is implemented).
- `assets/headshot.png` — Hero photo (replace as needed).

### Lint / Test / Build

- **Lint**: No linter is configured. For HTML validation, you can use an external validator or install one ad-hoc.
- **Tests**: No automated tests exist.
- **Build**: No build step is required — the site is plain static HTML.

### Notes

- **Fonts**: Inter is loaded from `fonts.googleapis.com` — internet access needed for typography; layout still works with system fallbacks defined in CSS.
- **Tool pages**: Each tool page is a stub with copy explaining what will ship next; wire in real UIs or external apps when ready.
