"use client";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  count?: number;
  gap?: number;
}

export default function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 8,
  count = 1,
  gap = 8,
}: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: typeof width === "number" ? `${width}px` : width,
            height: typeof height === "number" ? `${height}px` : height,
            borderRadius,
            background: "linear-gradient(90deg, var(--neutral-dark) 25%, var(--neutral) 50%, var(--neutral-dark) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            marginBottom: i < count - 1 ? gap : 0,
          }}
        />
      ))}
    </>
  );
}
