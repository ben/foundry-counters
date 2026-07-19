# FoundryVTT Module Development

This module extends Foundry Virtual Tabletop functionality.

## Documentation

- **Foundry API**: https://foundryvtt.com/api/
  - Primary reference for all classes, methods, and hooks
- **Module Development Guide**: https://foundryvtt.com/article/module-development/
- **KB Articles**: Module Sub-Types, Package Management

## Project Structure

```
module-name/
├── module.json          # Required manifest (id MUST match folder name exactly)
├── scripts/             # ES6 modules (use esmodules, not legacy scripts)
│   └── module.js        # Entry point
├── templates/           # Handlebars templates for UI
├── styles/              # CSS files
├── packs/               # Compendium packs (system-specific requires system field)
└── lang/                # Localization files
```

Module lives in `{foundryUserData}/Data/modules/{module-name}/` during development.

## Key Concepts

### Manifest (`module.json`)
**Required fields:**
- `id` — lowercase-hyphenated, must match folder name exactly (case-sensitive)
- `title` — Display name
- `description` — Brief description
- `version` — Semantic versioning

**Important optional:**
- `compatibility` — `{minimum, verified, maximum}` Foundry versions
- `esmodules` — Array of ES6 module paths (preferred over `scripts`)
- `styles` — Array of CSS paths
- `relationships` — Dependencies (`requires`, `conflicts`)
- `library` — Boolean; if true, loads before other modules (dev dependencies)

**Gotcha:** Malformed JSON blocks module recognition. Validate carefully.

### Hooks System
Primary integration point. Common hooks:
- `Hooks.on("init", fn)` — Runs at startup, before game data loads
- `Hooks.on("ready", fn)` — Game fully loaded, data available
- `Hooks.on("renderActorSheet", (sheet, html, data) => {})` — UI manipulation
- Full list: API docs → `hookEvents`

Example:
```js
Hooks.once("init", () => {
  console.log("Module initializing");
  // Register settings, extend CONFIG
});

Hooks.once("ready", () => {
  // Access game data via game.actors, game.items, etc.
});
```

### Documents (Data Layer)
Core data model: `Actor`, `Item`, `Scene`, `JournalEntry`, etc.
- **Primary Documents** — Dedicated DB tables, accessed via `game.actors`, `game.items`
- **Embedded Documents** — Nested within parents (e.g., `Actor.items`)
- Base classes: `DataModel` → `Document` → `ClientDocument`

**CRUD:**
```js
await Actor.create({name: "New Actor", type: "character"});
await actor.update({name: "Updated"});
await actor.delete();
```

**Collections:** Access via `game.actors`, `game.items.get(id)`, `game.scenes.getName(name)`

### Applications (UI Layer)
Modern API: `ApplicationV2`, `DocumentSheetV2`, `DialogV2`
- Uses Handlebars templates
- Extend to customize sheets: `class CustomSheet extends ActorSheet {}`
- Register via `Actors.registerSheet("module-name", CustomSheet, {types: ["character"]})`

### CONFIG Object
Global configuration. Extend to register custom classes:
```js
CONFIG.Actor.documentClass = CustomActor;
CONFIG.ui.someApp = MyApp;
```

## Common Patterns

### Extending Documents
```js
class CustomActor extends Actor {
  prepareBaseData() {
    super.prepareBaseData();
    // Custom logic
  }
}

Hooks.once("init", () => {
  CONFIG.Actor.documentClass = CustomActor;
});
```

### Adding UI Elements
```js
Hooks.on("renderActorSheet", (sheet, html, data) => {
  const button = $('<button>Custom Action</button>');
  button.click(() => { /* handler */ });
  html.find(".sheet-header").append(button);
});
```

### Module Settings
```js
game.settings.register("module-id", "settingName", {
  name: "Setting Display Name",
  hint: "Description",
  scope: "world",     // or "client"
  config: true,       // Show in module settings UI
  type: Boolean,
  default: false
});

// Access: game.settings.get("module-id", "settingName")
```

## Development Workflow

1. **Setup:** Create `{userData}/Data/modules/{module-name}/` with minimal `module.json`
2. **Verify:** Check Foundry Setup → Add-on Modules recognizes the module
3. **Code:** Add scripts referenced in `esmodules`, hook into `init`/`ready`
4. **Test:** F12 Console for debugging. Changes load on world refresh (hot reload)
5. **Package:** Ensure `manifest` and `download` URLs for auto-updates

## Gotchas

- **ID mismatch:** `module.json` `id` must exactly match folder name (case-sensitive, lowercase-hyphenated)
- **Module scope:** Modules only affect Game view, not Setup/Join screens
- **Private API:** `_methods` and `#private` have no stability guarantees. Use `@public` APIs; request additions if needed
- **System packs:** Compendium packs for specific systems require explicit `system` field (V10+)
- **ES6 preferred:** Use `esmodules` over legacy `scripts` field

## API Surface

Use only `@public` documented APIs. Private members (`_prefix`, `#private`) can break between versions.

**Key globals:**
- `game` — Game instance, collections, settings
- `CONFIG` — Configuration object
- `Hooks` — Event system
- `ui` — UI managers (notifications, context menus)
- `canvas` — Visual layer (tokens, tiles, etc.)

**Common classes:**
- Documents: `Actor`, `Item`, `Scene`, `JournalEntry`, `ChatMessage`
- Collections: `game.actors`, `game.items`, `game.scenes`
- UI: `Application`, `DocumentSheet`, `Dialog`
- Utilities: `foundry.utils.mergeObject`, `foundry.utils.duplicate`

+## Standing corrections (continued)
- **Handlebars context paths in nested loops**: `{{../parent.field}}` only goes up one level. Inside `#each outer` → `#each inner`, use `{{../../outer.field}}` or (better) flatten the data into the inner item so the template can reference `{{item.field}}` directly. (Was: `{{../group.docType}}` resolved to empty string inside nested `#each groups` → `#each group.counters`; fixed by adding `docType`/`docId` to each counter display object.)
- **ApplicationV2 action handlers**: Static private methods (`static #method`) don't work as action handlers — ApplicationV2's action system can't call them. Use protected/public static methods (`static _method` or `static method`) instead. (Was: registered `#onAddCounter` as action handler; buttons rendered but clicks did nothing.)
- **Handlebars helpers**: Don't use helpers that aren't registered (e.g. `capitalize`, `concat`). Either register them in the module init hook or prepare the data in `_prepareContext` so the template can use plain `{{value}}`. (Was: template used `{{capitalize counter.type}}` which threw "Missing helper" error.)

## Resources

- API docs for specific class/method signatures: https://foundryvtt.com/api/
- When in doubt, check API docs before implementation
- Request public API additions via Foundry forums if private API is the only option
