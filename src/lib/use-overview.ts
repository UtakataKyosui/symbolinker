import { useMutation, useQuery } from "@tanstack/react-query";
import { agentApi } from "@/lib/agent-api";
import { useAgent } from "@/lib/agent-context";
import type { Kind, Profile } from "@/bindings";

export function useOverview() {
  const { agent } = useAgent();
  return useQuery({
    queryKey: ["overview", agent],
    queryFn: () => agentApi.overview(agent),
  });
}

function logMutationError(label: string, err: unknown) {
  console.error(`[${label}]`, err instanceof Error ? err.message : err);
}

export function useAdopt() {
  const { agent } = useAgent();
  return useMutation({
    mutationFn: () => agentApi.adopt(agent),
    onError: (err) => logMutationError("useAdopt", err),
  });
}

export function useImportUnmanaged() {
  const { agent } = useAgent();
  return useMutation({
    mutationFn: () => agentApi.importUnmanaged(agent),
    onError: (err) => logMutationError("useImportUnmanaged", err),
  });
}

export function useSaveProfile() {
  const { agent } = useAgent();
  return useMutation({
    mutationFn: (profile: Profile) => agentApi.saveProfile(agent, profile),
    onError: (err) => logMutationError("useSaveProfile", err),
  });
}

export function useDeleteProfile() {
  const { agent } = useAgent();
  return useMutation({
    mutationFn: (name: string) => agentApi.deleteProfile(agent, name),
    onError: (err) => logMutationError("useDeleteProfile", err),
  });
}

export function useActivateProfile() {
  const { agent } = useAgent();
  return useMutation({
    mutationFn: (name: string) => agentApi.activateProfile(agent, name),
    onError: (err) => logMutationError("useActivateProfile", err),
  });
}

export function useUnlinkKind() {
  const { agent } = useAgent();
  return useMutation({
    mutationFn: (kind: Kind) => agentApi.unlinkKind(agent, kind),
    onError: (err) => logMutationError("useUnlinkKind", err),
  });
}
