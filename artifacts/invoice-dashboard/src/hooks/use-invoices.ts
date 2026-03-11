import { useQueryClient } from "@tanstack/react-query";
import {
  useListInvoices,
  useGetInvoiceSummary,
  useApproveInvoice,
  useMarkInvoiceNotDuplicate,
  useMergeVendorAlias,
  useUpdateInvoiceCategory,
  getListInvoicesQueryKey,
  getGetInvoiceSummaryQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "./use-toast";

export function useInvoices() {
  return useListInvoices();
}

export function useInvoiceSummary() {
  return useGetInvoiceSummary();
}

export function useInvoiceMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetInvoiceSummaryQueryKey() });
  };

  const approveMutation = useApproveInvoice({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "חשבונית אושרה", description: "החשבונית אושרה בהצלחה." });
      },
      onError: (error: { error?: string }) => {
        toast({
          title: "שגיאת אישור",
          description: error.error || "אירעה שגיאה בלתי צפויה.",
          variant: "destructive",
        });
      },
    },
  });

  const markNotDuplicateMutation = useMarkInvoiceNotDuplicate({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "סומנה כייחודית", description: "החשבונית סומנה כלא-כפולה." });
      },
      onError: (error: { error?: string }) => {
        toast({
          title: "הפעולה נכשלה",
          description: error.error || "לא ניתן לעדכן סטטוס כפילות.",
          variant: "destructive",
        });
      },
    },
  });

  const mergeAliasMutation = useMergeVendorAlias({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "כינוי ספק מוזג", description: "הכינוי קושר בהצלחה." });
      },
      onError: (error: { error?: string }) => {
        toast({
          title: "מיזוג נכשל",
          description: error.error || "לא ניתן למזג כינוי ספק.",
          variant: "destructive",
        });
      },
    },
  });

  const updateCategoryMutation = useUpdateInvoiceCategory({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "קטגוריה עודכנה", description: "הקטגוריה עודכנה בהצלחה." });
      },
      onError: (error: { error?: string }) => {
        toast({
          title: "עדכון נכשל",
          description: error.error || "לא ניתן לעדכן קטגוריה.",
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
    updateCategory: (id: string, finalCategory: string) =>
      updateCategoryMutation.mutate({ id, data: { finalCategory } }),
    isPending:
      approveMutation.isPending ||
      markNotDuplicateMutation.isPending ||
      mergeAliasMutation.isPending ||
      updateCategoryMutation.isPending,
  };
}
