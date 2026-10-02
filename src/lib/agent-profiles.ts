import type { Profile, Kind } from "@/bindings";

export function isEnabled(profile: Profile, kind: Kind, name: string): boolean {
  return profile.enabled[kind].includes(name);
}

/** 項目の有効/無効を切り替えた新しい Profile を返す(入力は変更しない、名前順を保つ)。 */
export function toggleItem(profile: Profile, kind: Kind, name: string, enabled: boolean): Profile {
  const current = profile.enabled[kind];
  const next = enabled
    ? current.includes(name)
      ? current
      : [...current, name].sort()
    : current.filter((item) => item !== name);
  return { ...profile, enabled: { ...profile.enabled, [kind]: next } };
}

export function enabledCount(profile: Profile): number {
  const { skills, agents, hooks, rules } = profile.enabled;
  return skills.length + agents.length + hooks.length + rules.length;
}
