import { useQueryClient } from "@tanstack/react-query";
import {
  useListInvoices,
  useApproveInvoice,
  useMarkInvoiceNotDuplicate,
  useMergeVendorAlias,
  getListInvoicesQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "./use-toast";

export function useInvoices() {
  return useListInvoices();
}

export function useInvoiceMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
  };

  const approveMutation = useApproveInvoice({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({
          title: "Invoice Approved",
          description: "The invoice has been successfully approved.",
        });
      },
      onError: (error) => {
        toast({
          title: "Approval Failed",
          description: error.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    },
  });

  const markNotDuplicateMutation = useMarkInvoiceNotDuplicate({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({
          title: "Marked as Unique",
          description: "The invoice has been marked as not a duplicate.",
        });
      },
      onError: (error) => {
        toast({
          title: "Action Failed",
          description: error.error || "Failed to update duplicate status.",
          variant: "destructive",
        });
      },
    },
  });

  const mergeAliasMutation = useMergeVendorAlias({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({
          title: "Vendor Alias Merged",
          description: "The vendor alias has been linked successfully.",
        });
      },
      onError: (error) => {
        toast({
          title: "Merge Failed",
          description: error.error || "Failed to merge vendor alias.",
          variant: "destructive",
        });
      },
    },
  });

  return {
    approve: (id: string) => approveMutation.mutate({ id }),
    markNotDuplicate: (id: string) => markNotDuplicateMutation.mutate({ id }),
    mergeAlias: (id: string, aliasName: string, targetVendorId: string) =>
      mergeAliasMutation.mutate({ id, data: { aliasName, targetVendorId } }),
    isPending:
      approveMutation.isPending ||
      markNotDuplicateMutation.isPending ||
      mergeAliasMutation.isPending,
  };
}
