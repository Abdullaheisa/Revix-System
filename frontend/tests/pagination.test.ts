import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizePage } from "../src/lib/workspace/pagination.ts";
import { getApiErrorMessage } from "../src/lib/api/errors.ts";

describe("Workspace pagination query input", () => {
  it("restores page 1 for absent, invalid or unsafe URL values", () => {
    for (const value of [null, undefined, "", "2abc", "-1", "0", "1.5", NaN, Infinity, 0, -3, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.equal(normalizePage(value), 1);
    }
    assert.equal(normalizePage("15"), 15);
    assert.equal(normalizePage(7), 7);
  });
});

describe("API error message parsing", () => {
  it("accepts backend messages and rejects unexpected payload shapes", () => {
    assert.equal(getApiErrorMessage({ data: { error: { message: "Cannot save" } } }), "Cannot save");
    for (const error of [null, undefined, "network", {}, { data: null }, { data: { error: null } }, { data: { error: { message: 42 } } }]) {
      assert.equal(getApiErrorMessage(error), undefined);
    }
  });
});
