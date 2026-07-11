import { SseEvent } from "@groweasy/shared";

type Listener = (event: SseEvent) => void;

class ImportJob {
  rows: Record<string, string>[];
  listeners: Set<Listener> = new Set();

  constructor(rows: Record<string, string>[]) {
    this.rows = rows;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
  }

  unsubscribe() {
    this.listeners.clear();
  }

  emit(event: SseEvent) {
    for (const l of this.listeners) l(event);
  }
}

const jobs = new Map<string, ImportJob>();

export function createJob(jobId: string, rows: Record<string, string>[]) {
  jobs.set(jobId, new ImportJob(rows));
}

export function getJob(jobId: string) {
  return jobs.get(jobId);
}