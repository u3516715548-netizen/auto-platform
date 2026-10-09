export const PUBLIC_LEAD_RATE_LIMIT_ENDPOINT = "storefront.createPublicLead" as const;
export const PUBLIC_FINANCE_RATE_LIMIT_ENDPOINT = "storefront.createFinanceApplication" as const;

/** 5 submission attempts / 10 minutes / IP / tenant / endpoint */
export const PUBLIC_LEAD_ATTEMPT_LIMIT = 5;
export const PUBLIC_LEAD_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

/** 3 accepted leads / hour / IP / tenant */
export const PUBLIC_LEAD_ACCEPT_LIMIT = 3;
export const PUBLIC_LEAD_ACCEPT_WINDOW_MS = 60 * 60 * 1000;

export type PublicLeadRateLimitScope = {
  ipHash: string;
  tenantId: string;
  endpoint?: string;
};

export type PublicLeadRateLimitVerdict = {
  allowed: boolean;
  /** Seconds until the client may retry (HTTP Retry-After semantics). */
  retryAfterSeconds?: number;
};

export interface PublicLeadRateLimitBackend {
  checkAttempt(scope: PublicLeadRateLimitScope, now?: number): PublicLeadRateLimitVerdict;
  recordAttempt(scope: PublicLeadRateLimitScope, now?: number): void;
  checkAccept(scope: PublicLeadRateLimitScope, now?: number): PublicLeadRateLimitVerdict;
  recordAccept(scope: PublicLeadRateLimitScope, now?: number): void;
}

type WindowStore = Map<string, number[]>;

function scopeKey(scope: PublicLeadRateLimitScope, kind: "attempt" | "accept"): string {
  const endpoint = scope.endpoint ?? PUBLIC_LEAD_RATE_LIMIT_ENDPOINT;
  return `${kind}|${endpoint}|${scope.tenantId}|${scope.ipHash}`;
}

function pruneTimestamps(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((ts) => now - ts < windowMs);
}

function verdictFromWindow(
  timestamps: number[],
  limit: number,
  windowMs: number,
  now: number,
): PublicLeadRateLimitVerdict {
  if (timestamps.length < limit) {
    return { allowed: true };
  }
  const oldest = Math.min(...timestamps);
  const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
  return { allowed: false, retryAfterSeconds };
}

/**
 * In-process sliding window — **local dev / single-node only**.
 * Not shared across instances; replace with Redis/KV before production multi-instance deploy.
 */
export function createInMemoryPublicLeadRateLimitBackend(): PublicLeadRateLimitBackend & {
  resetForTests(): void;
} {
  const attemptStore: WindowStore = new Map();
  const acceptStore: WindowStore = new Map();

  function getStore(kind: "attempt" | "accept"): WindowStore {
    return kind === "attempt" ? attemptStore : acceptStore;
  }

  function readWindow(
    kind: "attempt" | "accept",
    scope: PublicLeadRateLimitScope,
    windowMs: number,
    now: number,
  ): number[] {
    const key = scopeKey(scope, kind);
    const store = getStore(kind);
    const pruned = pruneTimestamps(store.get(key) ?? [], windowMs, now);
    store.set(key, pruned);
    return pruned;
  }

  return {
    checkAttempt(scope, now = Date.now()) {
      const timestamps = readWindow(
        "attempt",
        scope,
        PUBLIC_LEAD_ATTEMPT_WINDOW_MS,
        now,
      );
      return verdictFromWindow(
        timestamps,
        PUBLIC_LEAD_ATTEMPT_LIMIT,
        PUBLIC_LEAD_ATTEMPT_WINDOW_MS,
        now,
      );
    },
    recordAttempt(scope, now = Date.now()) {
      const key = scopeKey(scope, "attempt");
      const timestamps = readWindow(
        "attempt",
        scope,
        PUBLIC_LEAD_ATTEMPT_WINDOW_MS,
        now,
      );
      timestamps.push(now);
      attemptStore.set(key, timestamps);
    },
    checkAccept(scope, now = Date.now()) {
      const timestamps = readWindow("accept", scope, PUBLIC_LEAD_ACCEPT_WINDOW_MS, now);
      return verdictFromWindow(
        timestamps,
        PUBLIC_LEAD_ACCEPT_LIMIT,
        PUBLIC_LEAD_ACCEPT_WINDOW_MS,
        now,
      );
    },
    recordAccept(scope, now = Date.now()) {
      const key = scopeKey(scope, "accept");
      const timestamps = readWindow("accept", scope, PUBLIC_LEAD_ACCEPT_WINDOW_MS, now);
      timestamps.push(now);
      acceptStore.set(key, timestamps);
    },
    resetForTests() {
      attemptStore.clear();
      acceptStore.clear();
    },
  };
}

let defaultBackend: PublicLeadRateLimitBackend & { resetForTests(): void } =
  createInMemoryPublicLeadRateLimitBackend();

/** Replace backend in unit tests. */
export function setPublicLeadRateLimitBackendForTests(
  backend: PublicLeadRateLimitBackend & { resetForTests?: () => void },
): void {
  defaultBackend = backend as PublicLeadRateLimitBackend & { resetForTests(): void };
}

export function resetPublicLeadRateLimitBackendForTests(): void {
  defaultBackend.resetForTests();
}

export function getPublicLeadRateLimitBackend(): PublicLeadRateLimitBackend {
  return defaultBackend;
}
