import {
  commands,
  type Agent,
  type HookMeta,
  type Kind,
  type Overview,
  type Profile,
} from "@/bindings";
import { unwrapResult } from "@/lib/agent-result";

/** Tauri コマンドを、失敗時に例外を投げる Promise へ変換するだけの層。状態は持たない。 */
export const agentApi = {
  overview: async (agent: Agent): Promise<Overview> =>
    unwrapResult(await commands.agentOverview(agent)),
  adopt: async (agent: Agent): Promise<void> => {
    unwrapResult(await commands.adopt(agent));
  },
  importUnmanaged: async (agent: Agent): Promise<void> => {
    unwrapResult(await commands.importUnmanaged(agent));
  },
  saveProfile: async (agent: Agent, profile: Profile): Promise<void> => {
    unwrapResult(await commands.saveProfile(agent, profile));
  },
  deleteProfile: async (agent: Agent, name: string): Promise<void> => {
    unwrapResult(await commands.deleteProfile(agent, name));
  },
  activateProfile: async (agent: Agent, name: string): Promise<void> => {
    unwrapResult(await commands.activateProfile(agent, name));
  },
  unlinkKind: async (agent: Agent, kind: Kind): Promise<void> => {
    unwrapResult(await commands.unlinkKind(agent, kind));
  },
  getHookMeta: async (agent: Agent, name: string): Promise<HookMeta> =>
    unwrapResult(await commands.getHookMeta(agent, name)),
  saveHookMeta: async (agent: Agent, name: string, meta: HookMeta): Promise<void> => {
    unwrapResult(await commands.saveHookMeta(agent, name, meta));
  },
};
