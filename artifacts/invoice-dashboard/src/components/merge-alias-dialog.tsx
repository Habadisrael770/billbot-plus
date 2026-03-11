import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVendors } from "@/hooks/use-vendors";
import { Loader2 } from "lucide-react";

interface MergeAliasDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string | null;
  rawVendorName: string | null;
  onConfirm: (invoiceId: string, aliasName: string, targetVendorId: string) => void;
  isPending: boolean;
}

export function MergeAliasDialog({ isOpen, onClose, invoiceId, rawVendorName, onConfirm, isPending }: MergeAliasDialogProps) {
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const [aliasName, setAliasName] = useState("");
  const [targetVendorId, setTargetVendorId] = useState("");

  // Update local state when dialog opens with new data
  React.useEffect(() => {
    if (isOpen && rawVendorName) {
      setAliasName(rawVendorName);
      setTargetVendorId("");
    }
  }, [isOpen, rawVendorName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId || !aliasName || !targetVendorId) return;
    onConfirm(invoiceId, aliasName, targetVendorId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md glass-panel border-white/10 shadow-2xl shadow-black/50">
        <DialogHeader>
          <DialogTitle className="text-xl">Merge Vendor Alias</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Link this raw vendor name to an existing canonical vendor in your database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="aliasName" className="text-foreground">Alias Name</Label>
            <Input
              id="aliasName"
              value={aliasName}
              onChange={(e) => setAliasName(e.target.value)}
              className="bg-black/20 border-white/10 focus:border-primary focus:ring-primary/20 text-foreground"
              placeholder="e.g., Acme Corp Ltd."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetVendor" className="text-foreground">Target Canonical Vendor</Label>
            <Select value={targetVendorId} onValueChange={setTargetVendorId} required>
              <SelectTrigger className="bg-black/20 border-white/10 focus:border-primary focus:ring-primary/20 text-foreground">
                <SelectValue placeholder="Select a vendor..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10 text-foreground shadow-xl">
                {isLoadingVendors ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                ) : vendors?.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No vendors found</div>
                ) : (
                  vendors?.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id} className="focus:bg-white/5 focus:text-white">
                      {vendor.canonicalName} {vendor.taxId ? `(${vendor.taxId})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="border-white/10 hover:bg-white/5 text-foreground"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isPending || !aliasName || !targetVendorId}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Merging...
                </>
              ) : (
                "Merge Alias"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
