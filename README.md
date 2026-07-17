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

## Installation in Foundry

Symlink or copy the `dist/` directory to your Foundry VTT modules directory:

```bash
ln -s /path/to/foundry-counters/dist /path/to/FoundryVTT/Data/modules/foundry-counters
```

## TypeScript Types

This project uses the Foundry VTT types from the PF2e system repository (`types/foundry/`), which are more accurate than the community League types for v12+. These types are committed to the repository.
