import { describe, expect, it } from "vite-plus/test";
import { AgentApiError, errorMessage, unwrapResult } from "./agent-result";

describe("unwrapResult", () => {
  it("returns the data of an ok result, including null for void commands", () => {
    expect(unwrapResult({ status: "ok", data: 42 })).toBe(42);
    expect(unwrapResult({ status: "ok", data: null })).toBeNull();
  });

  it("throws AgentApiError carrying the backend message for an error result", () => {
    expect(() => unwrapResult({ status: "error", error: "既に取り込み済みです" })).toThrow(
      AgentApiError,
    );
    expect(() => unwrapResult({ status: "error", error: "既に取り込み済みです" })).toThrow(
      "既に取り込み済みです",
    );
  });
});

describe("errorMessage", () => {
  it("reads Error messages and stringifies everything else", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain")).toBe("plain");
    expect(errorMessage(7)).toBe("7");
  });
});
