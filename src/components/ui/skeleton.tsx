import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("rounded-md", className)}
      style={{
        background:
          "linear-gradient(90deg, var(--color-skeleton) 25%, var(--color-skeleton-highlight) 50%, var(--color-skeleton) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 2.5s linear infinite",
      }}
      {...props}
    />
  );
}
