export type ActionStatus = "ACCEPTED";

export type CreateActionResponse = {
  id: string;
  status: ActionStatus;
};

export type AuditEntry = {
  event: string;
  timestamp: string;
};

export type ActionDetail = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: ActionStatus;
  createdAt: string;
  audit: AuditEntry[];
};

export class IdempotencyConflictError extends Error {
  constructor(public readonly serverBody: unknown) {
    super("Idempotency key already used with a different request");
    this.name = "IdempotencyConflictError";
  }
}

export class TransientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "TransientError";
  }
}

export class NotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Action ${id} not found`);
    this.name = "NotFoundError";
  }
}

export type ActionsClientOptions = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  maxAttempts?: number;
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class ActionsClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(opts: ActionsClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.maxAttempts = opts.maxAttempts ?? 3;
    this.retryDelayMs = opts.retryDelayMs ?? 50;
    this.sleep = opts.sleep ?? defaultSleep;
  }

  async createAction(
    type: string,
    payload: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<CreateActionResponse> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/actions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ type, payload }),
      });
    } catch (err) {
      throw new TransientError(`Network error: ${(err as Error).message}`, err);
    }

    if (res.status === 200 || res.status === 201) {
      return (await res.json()) as CreateActionResponse;
    }
    if (res.status === 409) {
      throw new IdempotencyConflictError(await safeJson(res));
    }
    if (res.status >= 500) {
      throw new TransientError(`Server error ${res.status}`);
    }
    throw new Error(`Unexpected status ${res.status}: ${await res.text()}`);
  }

  async getAction(id: string): Promise<ActionDetail> {
    const res = await this.fetchImpl(`${this.baseUrl}/actions/${id}/`);
    if (res.status === 404) throw new NotFoundError(id);
    if (!res.ok) {
      throw new Error(`Failed to fetch action ${id}: ${res.status}`);
    }
    return (await res.json()) as ActionDetail;
  }

  async createActionWithRetry(
    type: string,
    payload: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<CreateActionResponse> {
    let lastError: TransientError | undefined;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await this.createAction(type, payload, idempotencyKey);
      } catch (err) {
        if (!(err instanceof TransientError)) throw err;
        lastError = err;
        if (attempt < this.maxAttempts) await this.sleep(this.retryDelayMs);
      }
    }
    throw lastError ?? new TransientError("Retries exhausted");
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
