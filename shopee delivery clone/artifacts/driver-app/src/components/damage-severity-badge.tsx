import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DamageSeverity = "none" | "minor" | "severe" | null | undefined;

const LABELS: Record<string, string> = {
  none: "No damage",
  minor: "Minor damage",
  severe: "Severe damage",
};

const STYLES: Record<string, string> = {
  none: "bg-muted text-muted-foreground border-border",
  minor: "bg-amber-100 text-amber-800 border-amber-200",
  severe: "bg-red-100 text-red-800 border-red-200",
};

/** Normalize legacy API values */
export function normalizeDamageSeverity(
  flag: string | null | undefined,
): "none" | "minor" | "severe" | null {
  if (!flag) return null;
  if (flag === "minor" || flag === "severe" || flag === "none") return flag;
  if (flag === "suspected") return "minor";
  if (flag === "confirmed") return "severe";
  return "none";
}

type DamageSeverityBadgeProps = {
  flag: DamageSeverity;
  className?: string;
};

export function DamageSeverityBadge({ flag, className }: DamageSeverityBadgeProps) {
  const normalized = normalizeDamageSeverity(flag ?? null);
  if (!normalized) return null;

  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-semibold capitalize", STYLES[normalized], className)}
    >
      {LABELS[normalized]}
    </Badge>
  );
}
