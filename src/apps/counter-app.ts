import type { Counter, ToggleState } from "../counters/types.js";
import {
  getCounters,
  setCounter,
  deleteCounter,
  clearCounters,
  canEdit,
} from "../counters/storage.js";
import { evaluateExpression } from "../counters/evaluate.js";
import type {
  ApplicationHeaderControlsEntry,
  ApplicationRenderContext,
} from "@client/applications/_types.mjs";

interface CounterDisplay {
  key: string;
  name: string;
  type: string;
  typeLabel: string;
  displayValue: string;
  editable: boolean;
  docType: string;
  docId: string;
  // For number counters
  value?: number;
  step?: number;
  // For toggle counters
  currentState?: ToggleState;
}

interface CounterGroup {
  label: string;
  docType: "user" | "actor";
  docId: string;
  editable: boolean;
  counters: CounterDisplay[];
}

interface CounterAppContext extends ApplicationRenderContext {
  groups: CounterGroup[];
}

function getControlledActors(): Actor[] {
  const actors: Actor[] = [];
  const seen = new Set<string>();

  for (const token of canvas.tokens.controlled) {
    if (token.actor && !seen.has(token.actor.id)) {
      actors.push(token.actor);
      seen.add(token.actor.id);
    }
  }

  const character = game.user.character as Actor | null;
  if (character && !seen.has(character.id)) {
    actors.push(character);
  }

  return actors;
}

export class CounterApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static override DEFAULT_OPTIONS = {
    id: "counter-app",
    window: {
      title: "COUNTER.Title",
    },
    position: {
      width: 400,
      height: "auto" as const,
    },
    actions: {
      addCounter: CounterApp._onAddCounter,
      editCounter: CounterApp._onEditCounter,
      deleteCounter: CounterApp._onDeleteCounter,
      numberInc: CounterApp._onNumberInc,
      numberDec: CounterApp._onNumberDec,
      toggleCycle: CounterApp._onToggleCycle,
      reset: CounterApp._onReset,
    },
  };

  static override PARTS = {
    main: {
      template: "modules/foundry-counters/templates/counter-app.hbs",
    },
  };

  protected override _getHeaderControls(): ApplicationHeaderControlsEntry[] {
    const controls = super._getHeaderControls();
    controls.push({
      icon: "fa-solid fa-trash",
      label: "COUNTER.Reset",
      action: "reset",
      visible: true,
    });
    return controls;
  }

  override async _prepareContext(options: any): Promise<CounterAppContext> {
    const groups: CounterGroup[] = [];

    // User group
    const userCounters = getCounters(game.user);
    groups.push({
      label: game.i18n.localize("COUNTER.UserCounters"),
      docType: "user",
      docId: game.user.id,
      editable: true,
      counters: this.#prepareCounters(userCounters, game.user, "user", game.user.id),
    });

    // Actor groups
    for (const actor of getControlledActors()) {
      const actorCounters = getCounters(actor);
      groups.push({
        label: actor.name ?? game.i18n.localize("COUNTER.UnnamedActor"),
        docType: "actor",
        docId: actor.id,
        editable: canEdit(actor),
        counters: this.#prepareCounters(actorCounters, actor, "actor", actor.id),
      });
    }

    return { groups };
  }

  #prepareCounters(
    counters: Record<string, Counter>,
    doc: User | Actor,
    docType: string,
    docId: string
  ): CounterDisplay[] {
    const editable = canEdit(doc);
    const actor = doc instanceof Actor ? doc : undefined;

    return Object.values(counters).map((counter) => {
      const type = counter.type || "number";
      const typeKey = `COUNTER.Type${type.charAt(0).toUpperCase() + type.slice(1)}`;
      const display: CounterDisplay = {
        key: counter.key,
        name: counter.name,
        type: type,
        typeLabel: game.i18n.localize(typeKey),
        displayValue: "",
        editable,
        docType,
        docId,
      };

      if (counter.type === "number") {
        display.displayValue = String(counter.value);
        display.value = counter.value;
        display.step = counter.step;
      } else if (counter.type === "toggle") {
        const state = counter.states[counter.index];
        display.displayValue = state?.label ?? "";
        display.currentState = state;
      } else if (counter.type === "calculated") {
        display.displayValue = evaluateExpression(
          counter.expression,
          counters,
          actor
        );
      }

      return display;
    });
  }

  _getDocument(docType: string, docId: string): User | Actor | null {
    if (docType === "user") {
      return game.user;
    }
    return game.actors.get(docId) ?? null;
  }

  static async _onAddCounter(
    this: CounterApp,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    const docType = target.dataset.docType;
    const docId = target.dataset.docId;
    if (!docType || !docId) return;

    const doc = this._getDocument(docType, docId);
    if (!doc || !canEdit(doc)) return;

    const counter = await this._showCounterDialog(doc, null);
    if (counter) {
      await setCounter(doc, counter);
      this.render();
    }
  }

  static async _onEditCounter(
    this: CounterApp,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    const docType = target.dataset.docType;
    const docId = target.dataset.docId;
    const key = target.dataset.key;
    if (!docType || !docId || !key) return;

    const doc = this._getDocument(docType, docId);
    if (!doc || !canEdit(doc)) return;

    const counters = getCounters(doc);
    const existing = counters[key];
    if (!existing) return;

    const counter = await this._showCounterDialog(doc, existing);
    if (counter) {
      // If key changed, delete old one
      if (counter.key !== existing.key) {
        await deleteCounter(doc, existing.key);
      }
      await setCounter(doc, counter);
      this.render();
    }
  }

  static async _onDeleteCounter(
    this: CounterApp,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    const docType = target.dataset.docType;
    const docId = target.dataset.docId;
    const key = target.dataset.key;
    if (!docType || !docId || !key) return;

    const doc = this._getDocument(docType, docId);
    if (!doc || !canEdit(doc)) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("COUNTER.DeleteConfirmTitle") },
      content: game.i18n.localize("COUNTER.DeleteConfirmContent"),
      rejectClose: false,
      modal: true,
    });

    if (confirmed) {
      await deleteCounter(doc, key);
      this.render();
    }
  }

  static async _onNumberInc(
    this: CounterApp,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    await CounterApp._adjustNumber.call(this, target, 1);
  }

  static async _onNumberDec(
    this: CounterApp,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    await CounterApp._adjustNumber.call(this, target, -1);
  }

  static async _adjustNumber(
    this: CounterApp,
    target: HTMLElement,
    direction: number
  ): Promise<void> {
    const docType = target.dataset.docType;
    const docId = target.dataset.docId;
    const key = target.dataset.key;
    if (!docType || !docId || !key) return;

    const doc = this._getDocument(docType, docId);
    if (!doc || !canEdit(doc)) return;

    const counters = getCounters(doc);
    const counter = counters[key];
    if (!counter || counter.type !== "number") return;

    counter.value += counter.step * direction;
    await setCounter(doc, counter);
    this.render();
  }

  static async _onToggleCycle(
    this: CounterApp,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    const docType = target.dataset.docType;
    const docId = target.dataset.docId;
    const key = target.dataset.key;
    if (!docType || !docId || !key) return;

    const doc = this._getDocument(docType, docId);
    if (!doc || !canEdit(doc)) return;

    const counters = getCounters(doc);
    const counter = counters[key];
    if (!counter || counter.type !== "toggle") return;

    counter.index = (counter.index + 1) % counter.states.length;
    await setCounter(doc, counter);
    this.render();
  }

  static async _onReset(
    this: CounterApp,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("COUNTER.ResetConfirmTitle") },
      content: game.i18n.localize("COUNTER.ResetConfirmContent"),
      rejectClose: false,
      modal: true,
    });
    if (!confirmed) return;

    await clearCounters(game.user);
    for (const actor of getControlledActors()) {
      if (canEdit(actor)) {
        await clearCounters(actor);
      }
    }
    this.render();
  }

  async _showCounterDialog(
    doc: User | Actor,
    existing: Counter | null
  ): Promise<Counter | null> {
    const isEdit = existing !== null;
    const title = game.i18n.localize(
      isEdit ? "COUNTER.EditCounter" : "COUNTER.AddCounter"
    );

    const content = `
      <form class="counter-form">
        <div class="form-group">
          <label>${game.i18n.localize("COUNTER.Name")}</label>
          <input type="text" name="name" value="${existing?.name ?? ""}" required />
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("COUNTER.Key")}</label>
          <input type="text" name="key" value="${existing?.key ?? ""}" required pattern="[a-zA-Z_][a-zA-Z0-9_]*" />
          <p class="hint">${game.i18n.localize("COUNTER.KeyHint")}</p>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("COUNTER.Type")}</label>
          <select name="type" ${isEdit ? "disabled" : ""}>
            <option value="number" ${existing?.type === "number" ? "selected" : ""}>${game.i18n.localize("COUNTER.TypeNumber")}</option>
            <option value="toggle" ${existing?.type === "toggle" ? "selected" : ""}>${game.i18n.localize("COUNTER.TypeToggle")}</option>
            <option value="calculated" ${existing?.type === "calculated" ? "selected" : ""}>${game.i18n.localize("COUNTER.TypeCalculated")}</option>
          </select>
        </div>
        <div class="form-group type-number" style="display: ${existing?.type === "number" || !existing ? "block" : "none"}">
          <label>${game.i18n.localize("COUNTER.InitialValue")}</label>
          <input type="number" name="number-value" value="${existing?.type === "number" ? existing.value : 0}" />
        </div>
        <div class="form-group type-number" style="display: ${existing?.type === "number" || !existing ? "block" : "none"}">
          <label>${game.i18n.localize("COUNTER.Step")}</label>
          <input type="number" name="number-step" value="${existing?.type === "number" ? existing.step : 1}" />
        </div>
        <div class="form-group type-toggle" style="display: ${existing?.type === "toggle" ? "block" : "none"}">
          <label>${game.i18n.localize("COUNTER.States")}</label>
          <textarea name="toggle-states" rows="4">${existing?.type === "toggle" ? existing.states.map((s) => `${s.label}:${s.color}`).join("\n") : ""}</textarea>
          <p class="hint">${game.i18n.localize("COUNTER.StatesHint")}</p>
        </div>
        <div class="form-group type-calculated" style="display: ${existing?.type === "calculated" ? "block" : "none"}">
          <label>${game.i18n.localize("COUNTER.Expression")}</label>
          <input type="text" name="calculated-expr" value="${existing?.type === "calculated" ? existing.expression : ""}" />
          <p class="hint">${game.i18n.localize("COUNTER.ExpressionHint")}</p>
        </div>
      </form>
    `;

    const result = await foundry.applications.api.DialogV2.wait({
      window: { title },
      content,
      buttons: [
        {
          action: "ok",
          label: game.i18n.localize("COUNTER.Save"),
          default: true,
          callback: (event: Event, button: HTMLButtonElement, dialog: HTMLDialogElement) => {
            const form = button.form;
            if (!form) return null;
            const formData = new FormData(form);
            const name = formData.get("name") as string;
            const key = formData.get("key") as string;
            const type = (formData.get("type") as string) ||
              (existing?.type ?? "number");

            if (!name || !key) return null;

            // Check key uniqueness
            const counters = getCounters(doc);
            if (
              (!isEdit || key !== existing.key) &&
              key in counters
            ) {
              console.error(game.i18n.localize("COUNTER.KeyExists"));
              return null;
            }

            if (type === "number") {
              return {
                key,
                name,
                type: "number" as const,
                value: Number(formData.get("number-value")) || 0,
                step: Number(formData.get("number-step")) || 1,
              };
            } else if (type === "toggle") {
              const statesText = formData.get("toggle-states") as string;
              const states = statesText
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [label, color] = line.split(":");
                  return { label: label?.trim() ?? "", color: color?.trim() ?? "" };
                });
              if (states.length === 0) {
                console.error(game.i18n.localize("COUNTER.StatesRequired"));
                return null;
              }
              return {
                key,
                name,
                type: "toggle" as const,
                states,
                index: existing?.type === "toggle" ? existing.index : 0,
              };
            } else {
              return {
                key,
                name,
                type: "calculated" as const,
                expression: (formData.get("calculated-expr") as string) || "",
              };
            }
          },
        },
        {
          action: "cancel",
          label: game.i18n.localize("COUNTER.Cancel"),
          callback: () => null,
        },
      ],
      render: (event: Event, dialog: any) => {
        const html = dialog.element as HTMLElement;
        const typeSelect = html.querySelector<HTMLSelectElement>(
          'select[name="type"]'
        );
        const typeGroups = {
          number: html.querySelectorAll(".type-number"),
          toggle: html.querySelectorAll(".type-toggle"),
          calculated: html.querySelectorAll(".type-calculated"),
        };

        typeSelect?.addEventListener("change", () => {
          const selected = typeSelect.value as keyof typeof typeGroups;
          for (const [type, elements] of Object.entries(typeGroups)) {
            Array.from(elements).forEach((el) => {
              (el as HTMLElement).style.display =
                type === selected ? "block" : "none";
            });
          }
        });
      },
      rejectClose: false,
      modal: true,
    });

    return result as Counter | null;
  }
}
