import type { Counter, ToggleState } from "../counters/types.js";
import {
  getCounters,
  setCounter,
  deleteCounter,
  clearCounters,
  type Bucket,
} from "../counters/storage.js";
import { evaluateExpression } from "../counters/evaluate.js";
import type {
  ApplicationClosingOptions,
  ApplicationHeaderControlsEntry,
  ApplicationRenderContext,
} from "@client/applications/_types.mjs";

const MODULE_ID = "foundry-counters";
const WINDOW_OPEN_SETTING = "windowOpen";
const SIDEBAR_GAP = 20;

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
  docType: "user" | "token";
  docId: string;
  editable: boolean;
  counters: CounterDisplay[];
}

interface CounterAppContext extends ApplicationRenderContext {
  groups: CounterGroup[];
}

interface TokenDescriptor {
  storageId: string;
  label: string;
  actor: Actor | undefined;
}

function tokenStorageId(token: (typeof canvas.tokens.controlled)[number]): string {
  return token.document.actorLink
    ? (token.document.actorId as string)
    : token.document.id;
}

function getControlledTokens(): TokenDescriptor[] {
  const descriptors: TokenDescriptor[] = [];
  const seen = new Set<string>();

  for (const token of canvas.tokens.controlled) {
    const storageId = tokenStorageId(token);
    if (seen.has(storageId)) continue;
    seen.add(storageId);
    descriptors.push({
      storageId,
      label: token.name ?? token.actor?.name ?? storageId,
      actor: token.actor ?? undefined,
    });
  }

  const character = game.user.character as Actor | null;
  if (character && !seen.has(character.id)) {
    descriptors.push({
      storageId: character.id,
      label: character.name ?? game.i18n.localize("COUNTER.UnnamedActor"),
      actor: character,
    });
  }

  return descriptors;
}

function bucketFromDataset(target: HTMLElement): Bucket | null {
  const docType = target.dataset.docType;
  const docId = target.dataset.docId;
  if (docType === "user") return { kind: "user" };
  if (docType === "token" && docId) return { kind: "token", id: docId };
  return null;
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

  protected override async _onFirstRender(
    context: object,
    options: any
  ): Promise<void> {
    await super._onFirstRender(context, options);
    this.#positionTopRight();
    await game.settings.set(MODULE_ID, WINDOW_OPEN_SETTING, true);
  }

  protected override _onClose(options: ApplicationClosingOptions): void {
    super._onClose(options);
    game.settings.set(MODULE_ID, WINDOW_OPEN_SETTING, false);
  }

  #positionTopRight(): void {
    const width =
      typeof this.position.width === "number" ? this.position.width : 400;
    const sidebar = document.getElementById("sidebar");

    let left: number;
    let top: number;
    if (sidebar) {
      const rect = sidebar.getBoundingClientRect();
      left = rect.left - SIDEBAR_GAP - width;
      top = rect.top + SIDEBAR_GAP;
    } else {
      left = window.innerWidth - width - SIDEBAR_GAP;
      top = SIDEBAR_GAP;
    }

    this.setPosition({ left, top });
  }

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
    const userBucket: Bucket = { kind: "user" };
    const userCounters = getCounters(userBucket);
    groups.push({
      label: game.i18n.localize("COUNTER.UserCounters"),
      docType: "user",
      docId: "",
      editable: true,
      counters: this.#prepareCounters(userCounters, userBucket, undefined),
    });

    // Token groups
    for (const token of getControlledTokens()) {
      const bucket: Bucket = { kind: "token", id: token.storageId };
      const tokenCounters = getCounters(bucket);
      groups.push({
        label: token.label,
        docType: "token",
        docId: token.storageId,
        editable: true,
        counters: this.#prepareCounters(tokenCounters, bucket, token.actor),
      });
    }

    return { groups };
  }

  #prepareCounters(
    counters: Record<string, Counter>,
    bucket: Bucket,
    actor: Actor | undefined
  ): CounterDisplay[] {
    const docType = bucket.kind;
    const docId = bucket.kind === "token" ? bucket.id : "";

    return Object.values(counters).map((counter) => {
      const type = counter.type || "number";
      const typeKey = `COUNTER.Type${type.charAt(0).toUpperCase() + type.slice(1)}`;
      const display: CounterDisplay = {
        key: counter.key,
        name: counter.name,
        type: type,
        typeLabel: game.i18n.localize(typeKey),
        displayValue: "",
        editable: true,
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

  static async _onAddCounter(
    this: CounterApp,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    const bucket = bucketFromDataset(target);
    if (!bucket) return;

    const counter = await this._showCounterDialog(bucket, null);
    if (counter) {
      await setCounter(bucket, counter);
      this.render();
    }
  }

  static async _onEditCounter(
    this: CounterApp,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    const bucket = bucketFromDataset(target);
    const key = target.dataset.key;
    if (!bucket || !key) return;

    const counters = getCounters(bucket);
    const existing = counters[key];
    if (!existing) return;

    const counter = await this._showCounterDialog(bucket, existing);
    if (counter) {
      // If key changed, delete old one
      if (counter.key !== existing.key) {
        await deleteCounter(bucket, existing.key);
      }
      await setCounter(bucket, counter);
      this.render();
    }
  }

  static async _onDeleteCounter(
    this: CounterApp,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    const bucket = bucketFromDataset(target);
    const key = target.dataset.key;
    if (!bucket || !key) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("COUNTER.DeleteConfirmTitle") },
      content: game.i18n.localize("COUNTER.DeleteConfirmContent"),
      rejectClose: false,
      modal: true,
    });

    if (confirmed) {
      await deleteCounter(bucket, key);
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
    const bucket = bucketFromDataset(target);
    const key = target.dataset.key;
    if (!bucket || !key) return;

    const counters = getCounters(bucket);
    const counter = counters[key];
    if (!counter || counter.type !== "number") return;

    counter.value += counter.step * direction;
    await setCounter(bucket, counter);
    this.render();
  }

  static async _onToggleCycle(
    this: CounterApp,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    const bucket = bucketFromDataset(target);
    const key = target.dataset.key;
    if (!bucket || !key) return;

    const counters = getCounters(bucket);
    const counter = counters[key];
    if (!counter || counter.type !== "toggle") return;

    counter.index = (counter.index + 1) % counter.states.length;
    await setCounter(bucket, counter);
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

    await clearCounters({ kind: "user" });
    for (const token of getControlledTokens()) {
      await clearCounters({ kind: "token", id: token.storageId });
    }
    this.render();
  }

  async _showCounterDialog(
    bucket: Bucket,
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
            const counters = getCounters(bucket);
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
