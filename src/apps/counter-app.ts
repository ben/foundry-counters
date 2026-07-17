interface CounterAppContext {
  count: number;
}

export class CounterApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private count = 0;

  static override DEFAULT_OPTIONS = {
    id: "counter-app",
    window: {
      title: "COUNTER.Title",
    },
    position: {
      width: 300,
      height: 200,
    },
    actions: {
      increment: CounterApp.#onIncrement,
      reset: CounterApp.#onReset,
    },
  };

  static override PARTS = {
    main: {
      template: "modules/foundry-counters/templates/counter-app.hbs",
    },
  };

  override async _prepareContext(): Promise<CounterAppContext> {
    return {
      count: this.count,
    };
  }

  static #onIncrement(this: CounterApp): void {
    this.count++;
    this.render();
  }

  static #onReset(this: CounterApp): void {
    this.count = 0;
    this.render();
  }
}
