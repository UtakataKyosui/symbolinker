import type { Skill } from "./harness-data";

export function setSkillEnabled(skill: Skill, enabled: boolean): Skill {
  if (skill.status === "Broken" || skill.status === "Collision") return skill;
  return { ...skill, enabled, status: enabled ? "Mounted" : "Unlinked" };
}

export function applyProfile(skills: Skill[], profileIndex: number): Skill[] {
  if (!Number.isInteger(profileIndex) || profileIndex < 0 || profileIndex > 3) return skills;
  return skills.map((skill) => setSkillEnabled(skill, skill.matrix[profileIndex]));
}

function matchesShape(value: unknown, sample: unknown): boolean {
  if (Array.isArray(sample)) {
    if (!Array.isArray(value) || !value.length) return false;
    // Matrices must retain a boolean for each profile; collections can gain entries.
    if (typeof sample[0] === "boolean" && value.length !== sample.length) return false;
    return value.every((item) => matchesShape(item, sample[0]));
  }
  if (sample !== null && typeof sample === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return Object.entries(sample).every(([key, field]) =>
      matchesShape((value as Record<string, unknown>)[key], field),
    );
  }
  return typeof value === typeof sample;
}

export function restorePreviewState<T>(raw: string | null, fallback: T): T {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    return matchesShape(value, fallback) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}
