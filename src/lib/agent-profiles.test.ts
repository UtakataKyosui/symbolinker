import { describe, expect, it } from "vite-plus/test";
import type { Profile } from "@/bindings";
import { enabledCount, isEnabled, toggleItem } from "./agent-profiles";

const base = (): Profile => ({
  name: "default",
  enabled: { skills: ["a", "c"], agents: [], hooks: ["h"], rules: [] },
});

describe("agent profiles", () => {
  it("reports whether an item is enabled per kind", () => {
    expect(isEnabled(base(), "skills", "a")).toBe(true);
    expect(isEnabled(base(), "skills", "h")).toBe(false);
    expect(isEnabled(base(), "hooks", "h")).toBe(true);
  });

  it("enables an item keeping names sorted and only touching that kind", () => {
    const before = base();
    const after = toggleItem(before, "skills", "b", true);
    expect(after.enabled.skills).toEqual(["a", "b", "c"]);
    expect(after.enabled.hooks).toEqual(before.enabled.hooks);
    expect(after.name).toBe("default");
  });

  it("does not duplicate an already enabled item", () => {
    expect(toggleItem(base(), "skills", "a", true).enabled.skills).toEqual(["a", "c"]);
  });

  it("disables an item and leaves unknown names alone", () => {
    expect(toggleItem(base(), "skills", "a", false).enabled.skills).toEqual(["c"]);
    expect(toggleItem(base(), "skills", "zzz", false).enabled.skills).toEqual(["a", "c"]);
  });

  it("never mutates its input", () => {
    const before = base();
    toggleItem(before, "skills", "b", true);
    toggleItem(before, "hooks", "h", false);
    expect(before).toEqual(base());
  });

  it("counts enabled items across kinds", () => {
    expect(enabledCount(base())).toBe(3);
  });
});
