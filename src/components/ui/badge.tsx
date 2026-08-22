import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-lake-100 text-lake-700 dark:bg-lake-700/30 dark:text-lake-100",
        success: "bg-forest-600/15 text-forest-700 dark:text-forest-600",
        warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
        danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
        muted: "bg-muted text-muted-foreground",
        accent: "bg-accent-500/15 text-accent-600",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
