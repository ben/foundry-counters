import { CounterApp } from "./apps/counter-app.js";

let counterApp: CounterApp | null = null;

Hooks.once("init", () => {
  console.log("Foundry Counters | Initializing");

  // Preload Handlebars templates
  foundry.applications.handlebars.loadTemplates([
    "modules/foundry-counters/templates/counter-app.hbs",
  ]);
});

Hooks.on("getSceneControlButtons", controls => {
  controls.tokens.tools.counters = {
    name: "counters",
    title: "COUNTER.OpenApp",
    icon: "fa-solid fa-calculator",
    order: Object.keys(controls.tokens.tools).length,
    button: true,
    visible: true,
    onChange: () => {
      if (!counterApp) {
        counterApp = new CounterApp();
      }
      counterApp.render({ force: true });
    }
  };
});

Hooks.on("controlToken", () => {
  if (counterApp?.rendered) {
    counterApp.render();
  }
});

Hooks.once("ready", () => {
  console.log("Foundry Counters | Ready");
});
