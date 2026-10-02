import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useAdopt() {
  const { agent } = useAgent();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => agentApi.adopt(agent),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["overview", agent] }),
  });
}

export function useImportUnmanaged() {
  const { agent } = useAgent();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => agentApi.importUnmanaged(agent),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["overview", agent] }),
  });
}

export function useSaveProfile() {
  const { agent } = useAgent();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: Profile) => agentApi.saveProfile(agent, profile),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["overview", agent] }),
  });
}

export function useDeleteProfile() {
  const { agent } = useAgent();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => agentApi.deleteProfile(agent, name),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["overview", agent] }),
  });
}

export function useActivateProfile() {
  const { agent } = useAgent();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => agentApi.activateProfile(agent, name),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["overview", agent] }),
  });
}

export function useUnlinkKind() {
  const { agent } = useAgent();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kind: Kind) => agentApi.unlinkKind(agent, kind),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["overview", agent] }),
  });
}
