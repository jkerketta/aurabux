"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FriendsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FriendsModal({ open, onOpenChange }: FriendsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Friends</DialogTitle>
        </DialogHeader>
        <div className="py-8 text-center text-sm text-muted-foreground">
          Coming soon
        </div>
      </DialogContent>
    </Dialog>
  );
}
