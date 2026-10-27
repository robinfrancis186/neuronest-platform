import type { Row } from "./api";

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

/** Keeps the two independently paged operational queues together in the UI. */
export function appendOperationsQueue(current: Row | undefined, next: Row): Row {
  return {
    ...next,
    outbox: [...rows(current?.outbox), ...rows(next.outbox)],
    payment_events: [...rows(current?.payment_events), ...rows(next.payment_events)],
  };
}
