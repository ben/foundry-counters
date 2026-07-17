import { CounterApp } from "./apps/counter-app.js";

Hooks.once("init", () => {
  console.log("Foundry Counters | Initializing");

  // Preload Handlebars templates
  loadTemplates([
    "modules/foundry-counters/templates/counter-app.hbs",
  ]);
});

Hooks.once("ready", () => {
  console.log("Foundry Counters | Ready");

  // Add a scene control button to open the counter app
  Hooks.on("getSceneControlButtons", (controls: SceneControls.Control[]) => {
    controls.push({
      name: "foundry-counters",
      title: "COUNTER.Title",
      icon: "fas fa-calculator",
      layer: "controls",
      visible: true,
      activeTool: "counter-app",
      tools: [
        {
          name: "counter-app",
          title: "COUNTER.OpenApp",
          icon: "fas fa-calculator",
          button: true,
          onClick: () => {
            new CounterApp().render({ force: true });
          },
        },
      ],
    });
  });
});
