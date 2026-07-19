import type { Counter } from "./types.js";

type CounterDocument = User | Actor;

const SCOPE = "foundry-counters";
const KEY = "counters";

export function getCounters(doc: CounterDocument): Record<string, Counter> {
  return (doc.getFlag(SCOPE, KEY) as Record<string, Counter> | undefined) ?? {};
}

export async function setCounter(
  doc: CounterDocument,
  counter: Counter
): Promise<void> {
  const counters = getCounters(doc);
  counters[counter.key] = counter;
  await doc.setFlag(SCOPE, KEY, counters);
}

export async function deleteCounter(
  doc: CounterDocument,
  key: string
): Promise<void> {
  const counters = getCounters(doc);
  delete counters[key];
  await doc.setFlag(SCOPE, KEY, counters);
}

export async function clearCounters(doc: CounterDocument): Promise<void> {
  await doc.unsetFlag(SCOPE, KEY);
}

export function canEdit(doc: CounterDocument): boolean {
  if (doc instanceof User) {
    return doc === game.user;
  }
  // Actor
  return game.user.isGM || doc.isOwner;
}
