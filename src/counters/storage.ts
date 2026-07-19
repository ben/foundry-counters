import type { Counter } from "./types.js";

const SCOPE = "foundry-counters";
const KEY = "counters";

export type Bucket = { kind: "user" } | { kind: "token"; id: string };

export interface CounterStore {
  user: Record<string, Counter>;
  tokens: Record<string, Record<string, Counter>>;
}

function isCounterStore(value: unknown): value is CounterStore {
  return (
    !!value &&
    typeof value === "object" &&
    "user" in value &&
    "tokens" in value
  );
}

function getStore(): CounterStore {
  const raw = game.user.getFlag(SCOPE, KEY) as unknown;
  if (isCounterStore(raw)) {
    return raw;
  }
  // Legacy shape: a flat Record<string, Counter> was the user's personal
  // counters. Migrate it into the `user` bucket on read.
  if (raw && typeof raw === "object") {
    return { user: raw as Record<string, Counter>, tokens: {} };
  }
  return { user: {}, tokens: {} };
}

async function saveStore(store: CounterStore): Promise<void> {
  await game.user.setFlag(SCOPE, KEY, store);
}

function bucketMap(
  store: CounterStore,
  bucket: Bucket
): Record<string, Counter> {
  if (bucket.kind === "user") {
    return store.user;
  }
  return (store.tokens[bucket.id] ??= {});
}

export function getCounters(bucket: Bucket): Record<string, Counter> {
  const store = getStore();
  return bucketMap(store, bucket);
}

export async function setCounter(
  bucket: Bucket,
  counter: Counter
): Promise<void> {
  const store = getStore();
  const counters = bucketMap(store, bucket);
  counters[counter.key] = counter;
  await saveStore(store);
}

export async function deleteCounter(
  bucket: Bucket,
  key: string
): Promise<void> {
  const store = getStore();
  const counters = bucketMap(store, bucket);
  delete counters[key];
  await saveStore(store);
}

export async function clearCounters(bucket: Bucket): Promise<void> {
  const store = getStore();
  if (bucket.kind === "user") {
    store.user = {};
  } else {
    delete store.tokens[bucket.id];
  }
  await saveStore(store);
}
