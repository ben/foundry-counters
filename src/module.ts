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
  // Hooks.on("getSceneControlButtons", (controls: Record<string, SceneControls.Control>) => {
  //   controls.tokens.tools['myTool'] = {
  //     name: "counter-app",
  //     title: "COUNTER.OpenApp",
  //     icon: "fas fa-calculator",
  //     button: true,
  //     onClick: () => {
  //       new CounterApp().render({ force: true });
  //     },
  //   };
  // });

  Hooks.on("getSceneControlButtons", controls => {
    controls.tokens.tools.myTool = {
      name: "myTool",
      title: "MyTool.Title",
      icon: "fa-solid fa-wrench",
      order: Object.keys(controls.tokens.tools).length,
      button: true,
      visible: game.user.isGM,
      onChange: () => {
        new CounterApp().render({ force: true });
      }
    };
    console.log('!!!', controls)
  });
});
