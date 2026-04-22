/**
 * Deterministic transient-failure simulation:
 * MSW handlers use a closure-captured counter to return 503 on the first N
 * calls and 201 thereafter. The counter is fully deterministic — no randomness
 * or time-based logic — and resets between tests via server.resetHandlers().
 */
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import {
  ActionsClient,
  IdempotencyConflictError,
  NotFoundError,
  TransientError,
} from "./actionsClient";

const BASE = "http://api.test/api";
const KEY = "abc-123";
const BODY = {
  type: "USER_EMAIL_CHANGE",
  payload: { oldEmail: "old@example.com", newEmail: "new@example.com" },
};
const CREATED = { id: "act_a1b2c3d4e5f6", status: "ACCEPTED" as const };

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const newClient = () =>
  new ActionsClient({ baseUrl: BASE, sleep: () => Promise.resolve() });

describe("ActionsClient.createAction", () => {
  it("returns the parsed response and sends the Idempotency-Key header", async () => {
    const seen: string[] = [];
    server.use(
      http.post(`${BASE}/actions/`, ({ request }) => {
        seen.push(request.headers.get("Idempotency-Key") ?? "");
        return HttpResponse.json(CREATED, { status: 201 });
      }),
    );

    const result = await newClient().createAction(BODY.type, BODY.payload, KEY);

    expect(result).toEqual(CREATED);
    expect(seen).toEqual([KEY]);
  });

  it("idempotent replay returns the same response with the same key", async () => {
    const seen: string[] = [];
    server.use(
      http.post(`${BASE}/actions/`, ({ request }) => {
        seen.push(request.headers.get("Idempotency-Key") ?? "");
        // Server semantics: first call → 201, subsequent → 200 with same body.
        const status = seen.length === 1 ? 201 : 200;
        return HttpResponse.json(CREATED, { status });
      }),
    );

    const client = newClient();
    const a = await client.createAction(BODY.type, BODY.payload, KEY);
    const b = await client.createAction(BODY.type, BODY.payload, KEY);

    expect(a).toEqual(b);
    expect(seen).toEqual([KEY, KEY]);
  });

  it("raises IdempotencyConflictError on 409 with the server body attached", async () => {
    server.use(
      http.post(`${BASE}/actions/`, () =>
        HttpResponse.json(
          { error: "Idempotency key already used with a different request" },
          { status: 409 },
        ),
      ),
    );

    const err = await newClient()
      .createAction(BODY.type, BODY.payload, KEY)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(IdempotencyConflictError);
    expect((err as IdempotencyConflictError).serverBody).toMatchObject({
      error: expect.stringContaining("Idempotency key"),
    });
  });
});

describe("ActionsClient.getAction", () => {
  it("returns the action detail including the audit history", async () => {
    const detail = {
      id: CREATED.id,
      type: BODY.type,
      payload: BODY.payload,
      status: "ACCEPTED" as const,
      createdAt: "2026-04-16T10:15:00Z",
      audit: [
        { event: "ACTION_CREATED", timestamp: "2026-04-16T10:15:00Z" },
        { event: "IDEMPOTENCY_REPLAY", timestamp: "2026-04-16T10:15:05Z" },
      ],
    };
    server.use(
      http.get(`${BASE}/actions/${CREATED.id}/`, () =>
        HttpResponse.json(detail),
      ),
    );

    const result = await newClient().getAction(CREATED.id);

    expect(result).toEqual(detail);
    expect(result.audit.map((e) => e.event)).toEqual([
      "ACTION_CREATED",
      "IDEMPOTENCY_REPLAY",
    ]);
  });

  it("throws NotFoundError on 404", async () => {
    server.use(
      http.get(`${BASE}/actions/act_missing/`, () =>
        HttpResponse.json({ detail: "Not found" }, { status: 404 }),
      ),
    );

    await expect(newClient().getAction("act_missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("ActionsClient.createActionWithRetry", () => {
  it("retries transient failures and reuses the same Idempotency-Key", async () => {
    const seen: string[] = [];
    let n = 0;
    server.use(
      http.post(`${BASE}/actions/`, ({ request }) => {
        seen.push(request.headers.get("Idempotency-Key") ?? "");
        n += 1;
        if (n < 3) return new HttpResponse(null, { status: 503 });
        return HttpResponse.json(CREATED, { status: 201 });
      }),
    );

    const result = await newClient().createActionWithRetry(
      BODY.type,
      BODY.payload,
      KEY,
    );

    expect(result).toEqual(CREATED);
    expect(seen).toHaveLength(3);
    expect(new Set(seen)).toEqual(new Set([KEY])); // every retry used the same key
  });

  it("gives up with TransientError after maxAttempts", async () => {
    let n = 0;
    server.use(
      http.post(`${BASE}/actions/`, () => {
        n += 1;
        return new HttpResponse(null, { status: 503 });
      }),
    );

    await expect(
      newClient().createActionWithRetry(BODY.type, BODY.payload, KEY),
    ).rejects.toBeInstanceOf(TransientError);
    expect(n).toBe(3);
  });
});
