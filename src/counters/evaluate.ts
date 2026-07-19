import type { Counter } from "./types.js";

export function evaluateExpression(
  expression: string,
  counters: Record<string, Counter>,
  actor: Actor
): string {
  try {
    // Build counter data namespace
    const counterData: Record<string, number | string> = {};
    for (const [key, counter] of Object.entries(counters)) {
      if (counter.type === "number") {
        counterData[key] = counter.value;
      } else if (counter.type === "toggle") {
        const state = counter.states[counter.index];
        counterData[key] = state?.label ?? "";
      }
      // Skip calculated counters to avoid cycles
    }

    // Merge actor roll data with counters namespace
    const data = { ...actor.getRollData(), counters: counterData };

    // Evaluate using Foundry's Roll evaluator
    const roll = new Roll(expression, data);
    roll.evaluateSync();
    return String(roll.total);
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
