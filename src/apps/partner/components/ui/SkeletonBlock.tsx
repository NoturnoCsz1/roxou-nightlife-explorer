/**
 * SkeletonBlock — placeholder shimmer reusável.
 */
import { cn } from "@/lib/utils";

export function SkeletonBlock({
  className,
  height = 16,
  width,
}: {
  className?: string;
  height?: number | string;
  width?: number | string;
}) {
  return (
    <div
      className={cn("partner-skeleton", className)}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        width: width ? (typeof width === "number" ? `${width}px` : width) : undefined,
      }}
    />
  );
}

export default SkeletonBlock;
