/**
 * Abstracție joburi async — pregătită pentru Inngest / Trigger.dev.
 * Nu legăm încă un provider extern.
 */

export type JobName =
  | "reservation.expire"
  | "media.process"
  | "audit.flush"
  | "integration.sync";

export type JobPayload = Record<string, unknown>;

export interface JobClient {
  enqueue(name: JobName, payload: JobPayload, options?: { runAt?: Date }): Promise<{ id: string }>;
}

/** No-op client pentru development până la integrarea providerului. */
export class InMemoryJobClient implements JobClient {
  async enqueue(name: JobName, payload: JobPayload): Promise<{ id: string }> {
    const id = `job_${Date.now()}`;
    console.warn("[jobs:noop]", name, payload, id);
    return { id };
  }
}
