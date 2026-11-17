import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../src/middleware/error-handler.js";
import { notFoundHandler } from "../../src/middleware/not-found.js";
import { requestId } from "../../src/middleware/request-id.js";

function appThatThrows(error: unknown): express.Express {
  const app = express();
  app.use(requestId);
  app.use(express.json());
  app.post("/boom", () => {
    throw error;
  });
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  it("returns a generic 500 without leaking internals", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await request(appThatThrows(new Error("relation secret_table does not exist"))).post("/boom").expect(500);

    expect(res.body).toEqual({
      error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred", requestId: expect.any(String) },
    });
    expect(JSON.stringify(res.body)).not.toContain("secret_table");
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it("maps malformed JSON to 400 INVALID_JSON", async () => {
    const res = await request(appThatThrows(new Error("unused")))
      .post("/boom")
      .set("Content-Type", "application/json")
      .send("{not json")
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("returns 404 ROUTE_NOT_FOUND for unknown routes and echoes a safe X-Request-Id", async () => {
    const res = await request(appThatThrows(null)).get("/nope").set("X-Request-Id", "abc-123").expect(404);
    expect(res.body.error).toMatchObject({ code: "ROUTE_NOT_FOUND", requestId: "abc-123" });
    expect(res.headers["x-request-id"]).toBe("abc-123");
  });

  it("replaces an unsafe X-Request-Id with a generated one", async () => {
    const res = await request(appThatThrows(null)).get("/nope").set("X-Request-Id", "bad id; DROP").expect(404);
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });
});
