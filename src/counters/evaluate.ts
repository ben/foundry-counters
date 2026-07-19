import type { Counter } from "./types.js";

export function evaluateExpression(
  expression: string,
  counters: Record<string, Counter>,
  actor?: Actor
): string {
  try {
    const scope: Record<string, unknown> = {};

    // Add resolved non-calculated counter values
    for (const [key, counter] of Object.entries(counters)) {
      if (counter.type === "number") {
        scope[key] = counter.value;
      } else if (counter.type === "toggle") {
        const state = counter.states[counter.index];
        scope[key] = state?.label ?? "";
      }
      // Skip calculated counters to avoid cycles
    }

    // Add actor roll data if available
    if (actor) {
      const rollData = actor.getRollData();
      Object.assign(scope, rollData);
    }

    // Evaluate with `with` statement to allow bare key references
    const fn = new Function(
      "scope",
      `with(scope){ return (${expression}); }`
    );
    const result = fn(scope);

    return String(result);
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
