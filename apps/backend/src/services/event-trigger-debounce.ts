import type { EventContext } from "./trigger-execution.ts";
import type { trigger as triggerTable } from "../db/schema.ts";

type Trigger = typeof triggerTable.$inferSelect;

const pendingTriggers = new Map<
  string,
  {
    timer: ReturnType<typeof setTimeout>;
    trigger: Trigger;
    eventContext: EventContext;
  }
>();

const DEBOUNCE_MS = 5_000;

export function debounceTriggerExecution(
  key: string,
  trigger: Trigger,
  eventContext: EventContext,
  executeFn: (trigger: Trigger, eventContext: EventContext) => Promise<void>,
): void {
  const existing = pendingTriggers.get(key);
  if (existing) {
    clearTimeout(existing.timer);
  }

  const timer = setTimeout(() => {
    pendingTriggers.delete(key);
    void executeFn(trigger, eventContext);
  }, DEBOUNCE_MS);

  pendingTriggers.set(key, { timer, trigger, eventContext });
}

export function clearPendingTriggers(): void {
  for (const { timer } of pendingTriggers.values()) {
    clearTimeout(timer);
  }
  pendingTriggers.clear();
}
