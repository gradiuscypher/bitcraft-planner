import { Badge } from "@/components/ui/badge";

export type TierTagProps = {
  tier?: number | null;
  size?: "sm" | "md";
  className?: string;
};

function getTierClasses(tier: number): string {
  switch (tier) {
    case 1:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    case 2:
      // Brown approximation using amber
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
    case 3:
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case 4:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    case 5:
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
    case 6:
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    case 7:
      // Gold approximation using yellow
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
  }
}

export function TierTag({ tier, size = "sm", className = "" }: TierTagProps) {
  if (!tier || tier <= 0) return null;
  const sizeClasses = size === "sm" ? "text-[10px] h-5 px-1.5" : "text-xs h-6 px-2";
  return (
    <Badge
      variant="outline"
      className={`${getTierClasses(tier)} ${sizeClasses} ${className}`}
      title={`Tier ${tier}`}
    >
      T{tier}
    </Badge>
  );
}
