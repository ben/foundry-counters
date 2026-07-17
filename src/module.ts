import { CounterApp } from "./apps/counter-app.js";

Hooks.once("init", () => {
  console.log("Foundry Counters | Initializing");

  // Preload Handlebars templates
  loadTemplates([
    "modules/foundry-counters/templates/counter-app.hbs",
  ]);
});

Hooks.on("getSceneControlButtons", controls => {
  controls.tokens.tools.myTool = {
    name: "myTool",
    title: "MyTool.Title",
    icon: "fa-solid fa-calculator",
    order: Object.keys(controls.tokens.tools).length,
    button: true,
    visible: game.user.isGM,
    onChange: () => {
      new CounterApp().render({ force: true });
    }
  };
  console.log('!!!', controls)
});

Hooks.once("ready", () => {
  console.log("Foundry Counters | Ready");
});
