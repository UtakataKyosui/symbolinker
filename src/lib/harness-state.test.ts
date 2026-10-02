import { describe, expect, it } from "vite-plus/test";
import { initialSkills } from "./harness-data";
import { applyProfile, restorePreviewState, setSkillEnabled } from "./harness-state";

describe("harness preview configuration", () => {
  it("switches the mounted stack to Python without hiding unresolved definitions", () => {
    const before = structuredClone(initialSkills);
    const after = applyProfile(before, 2);
    expect(after.find((skill) => skill.id === "react-compiler-audit")).toMatchObject({
      enabled: false,
      status: "Unlinked",
    });
    expect(after.find((skill) => skill.id === "fastapi-pydantic-v2")).toMatchObject({
      enabled: true,
      status: "Mounted",
    });
    expect(after.find((skill) => skill.id === "python-type-checker")).toMatchObject({
      enabled: false,
      status: "Broken",
    });
    expect(after.find((skill) => skill.id === "tailwind-v4-migrator")).toMatchObject({
      status: "Collision",
    });
    expect(before).toEqual(initialSkills);
    expect(after.map((skill) => skill.matrix)).toEqual(before.map((skill) => skill.matrix));
  });
  it("preserves broken and conflicting links during bulk operations", () => {
    for (const skill of initialSkills.filter((skill) =>
      ["Broken", "Collision"].includes(skill.status),
    )) {
      expect(setSkillEnabled(skill, true)).toEqual(skill);
      expect(setSkillEnabled(skill, false)).toEqual(skill);
    }
  });
  it("restores matrix edits and rejects corrupt or outdated local storage", () => {
    const edited = structuredClone(initialSkills);
    edited[0].matrix[0] = false;
    expect(restorePreviewState(JSON.stringify(edited), initialSkills)).toEqual(edited);
    for (const raw of [
      null,
      "{broken json",
      "{}",
      "[null]",
      JSON.stringify([{ ...initialSkills[0], matrix: [true] }]),
      JSON.stringify([{ ...initialSkills[0], matrix: [true, true, true, "yes"] }]),
    ]) {
      expect(restorePreviewState(raw, initialSkills)).toEqual(initialSkills);
    }
  });
  it("ignores an invalid profile selection", () => {
    expect(applyProfile(initialSkills, -1)).toEqual(initialSkills);
    expect(applyProfile(initialSkills, 4)).toEqual(initialSkills);
  });
});
