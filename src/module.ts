import { CounterApp } from "./apps/counter-app.js";

const MODULE_ID = "foundry-counters";
const WINDOW_OPEN_SETTING = "windowOpen";

let counterApp: CounterApp | null = null;

function toggleCounterApp(): void {
  if (counterApp?.rendered) {
    counterApp.close();
  } else {
    if (!counterApp) {
      counterApp = new CounterApp();
    }
    counterApp.render({ force: true });
  }
}

Hooks.once("init", () => {
  console.log("Foundry Counters | Initializing");

  // Preload Handlebars templates
  foundry.applications.handlebars.loadTemplates([
    "modules/foundry-counters/templates/counter-app.hbs",
  ]);

  game.settings.register(MODULE_ID, WINDOW_OPEN_SETTING, {
    name: "Counter window open",
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
  });
});

Hooks.on("getSceneControlButtons", controls => {
  controls.tokens.tools.counters = {
    name: "counters",
    title: "COUNTER.OpenApp",
    icon: "fa-solid fa-calculator",
    order: Object.keys(controls.tokens.tools).length,
    button: true,
    visible: true,
    onChange: () => toggleCounterApp(),
  };
});

Hooks.on("controlToken", () => {
  if (counterApp?.rendered) {
    counterApp.render();
  }
});

// Re-render when actor data changes (to update calculated counters)
Hooks.on("updateActor", () => {
  if (counterApp?.rendered) {
    counterApp.render();
  }
});

// Re-render when combat state changes (flags, turn, round)
Hooks.on("updateCombat", () => {
  if (counterApp?.rendered) {
    counterApp.render();
  }
});

// Re-render when token document data changes (unlinked tokens)
Hooks.on("updateToken", () => {
  if (counterApp?.rendered) {
    counterApp.render();
  }
});

Hooks.once("ready", () => {
  console.log("Foundry Counters | Ready");

  if (game.settings.get(MODULE_ID, WINDOW_OPEN_SETTING)) {
    counterApp = new CounterApp();
    counterApp.render({ force: true });
  }
});
