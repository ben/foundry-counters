# Foundry Counters

A TypeScript-based FoundryVTT module demonstrating ApplicationV2 with Handlebars templates.

## Development Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Build:
   ```bash
   pnpm build
   ```

3. Watch mode for development:
   ```bash
   pnpm watch
   ```

### Live Dev Server (Recommended)

For auto-reloading during development:

1. Ensure Foundry is running on port 30000 and the `dist/` directory is symlinked into your Foundry modules directory (see Installation section below)
2. Run the dev server:
   ```bash
   pnpm start
   ```
3. Browse to `http://localhost:30001` (instead of the normal Foundry port)
4. Edits to source files (`.ts`, `.hbs`, `.css`, `lang/*.json`) will trigger an automatic full tab reload

The dev server proxies all non-module requests to Foundry while serving the module's own assets fresh from source.

## Installation in Foundry

Symlink or copy the `dist/` directory to your Foundry VTT modules directory:

```bash
ln -s /path/to/foundry-counters/dist /path/to/FoundryVTT/Data/modules/foundry-counters
```

## TypeScript Types

This project uses the Foundry VTT types from the PF2e system repository (`types/foundry/`), which are more accurate than the community League types for v12+. These types are committed to the repository.
