import type { Agent, Profile, Kind } from "@/bindings";
import { agentApi } from "@/lib/agent-api";
import { useAgentOverview } from "./use-agent-overview";
import { useAsyncAction } from "./use-async-action";

/**
 * 現況の読み込みと各操作を組み合わせる唯一の場所。
 * 操作が成功したら現況を読み直す。各操作の pending / error は操作ごとに独立している。
 */
export function useAgentManager(agent: Agent) {
  const { reload, ...overview } = useAgentOverview(agent);

  const adopt = useAsyncAction(async () => {
    await agentApi.adopt(agent);
    await reload();
  });
  const importUnmanaged = useAsyncAction(async () => {
    await agentApi.importUnmanaged(agent);
    await reload();
  });
  const saveProfile = useAsyncAction(async (profile: Profile) => {
    await agentApi.saveProfile(agent, profile);
    await reload();
  });
  const deleteProfile = useAsyncAction(async (name: string) => {
    await agentApi.deleteProfile(agent, name);
    await reload();
  });
  const activateProfile = useAsyncAction(async (name: string) => {
    await agentApi.activateProfile(agent, name);
    await reload();
  });
  const unlinkKind = useAsyncAction(async (kind: Kind) => {
    await agentApi.unlinkKind(agent, kind);
    await reload();
  });

  return {
    ...overview,
    reload,
    adopt,
    importUnmanaged,
    saveProfile,
    deleteProfile,
    activateProfile,
    unlinkKind,
  };
}
