import assert from "node:assert/strict";
import { it } from "node:test";
import type { BackendEnvConfig } from "../src/config/env.ts";
import { createCorsPolicy } from "../src/security/corsPolicy.ts";

it("allows configured origins rather than arbitrary localhost or preview lookalikes", () => {
  const origin = createCorsPolicy({
    nodeEnv: "production",
    frontendOrigin: "https://app.example.com, https://admin.example.com",
  } as BackendEnvConfig).origin;
  assert.equal(typeof origin, "function");
  if (typeof origin !== "function") throw new Error("Expected an origin callback");
  for (const [value, expected] of [
    [undefined, true],
    ["https://app.example.com", true],
    ["https://admin.example.com", true],
    ["https://app.example.com.evil.test", false],
    ["https://localhost.evil.test", false],
    ["https://unrelated.vercel.app", false],
  ] as const) {
    origin(value, (error, allowed) => {
      assert.ifError(error);
      assert.equal(allowed, expected);
    });
  }
});

it("rejects wildcard credential origins in production", () => {
  assert.throws(() => createCorsPolicy({ nodeEnv: "production", frontendOrigin: "*" } as BackendEnvConfig), /explicit origins/);
});
