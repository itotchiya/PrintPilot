import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  active: boolean;
}

export function StatusBadge({ active }: StatusBadgeProps) {
  return (
    <Badge
      variant={active ? "default" : "secondary"}
      className={
        active
          ? "bg-primary/15 text-primary hover:bg-primary/20"
          : "bg-muted text-muted-foreground hover:bg-muted"
      }
    >
      {active ? "Actif" : "Inactif"}
    </Badge>
  );
}
