import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DeleteIconButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
};

export function DeleteIconButton({
  onClick,
  disabled = false,
  ariaLabel = "Delete",
  className,
}: DeleteIconButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant="ghost"
      size="icon"
      aria-label={ariaLabel}
      className={cn(
        "size-8 shrink-0 text-muted-foreground transition-colors hover:text-destructive",
        className,
      )}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
