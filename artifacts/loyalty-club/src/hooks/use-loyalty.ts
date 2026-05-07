import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { registerMember, getMembers, getStats, deleteMember, resendWhatsApp, RegisterPayload } from "@/lib/api";

export function useLoyaltyMembers() {
  return useQuery({
    queryKey: ["loyalty", "members"],
    queryFn: getMembers,
  });
}

export function useLoyaltyStats() {
  return useQuery({
    queryKey: ["loyalty", "stats"],
    queryFn: getStats,
  });
}

export function useRegisterMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterPayload) => registerMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty", "members"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty", "stats"] });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty", "members"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty", "stats"] });
    },
  });
}

export function useResendWhatsApp() {
  return useMutation({
    mutationFn: (id: string) => resendWhatsApp(id),
  });
}
