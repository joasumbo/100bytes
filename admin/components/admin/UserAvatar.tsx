"use client";

const COLORS = [
  "#F57C00", "#6366F1", "#10B981", "#EF4444",
  "#8B5CF6", "#EC4899", "#0EA5E9", "#14B8A6",
  "#F59E0B", "#3B82F6",
];

export function getInitialColor(name: string): string {
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

interface UserAvatarProps {
  name: string;
  photoKey?: string | null;
  size?: number;
  className?: string;
  textSizeClass?: string;
}

export default function UserAvatar({ name, photoKey, size = 40, className = "", textSizeClass = "text-sm" }: UserAvatarProps) {
  const initial = (name?.[0] ?? "?").toUpperCase();
  const color = getInitialColor(name ?? "A");

  if (photoKey) {
    return (
      <img
        src={`https://cdn.100bytes.co.ao/${photoKey}`}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, background: color }}
      className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 select-none ${textSizeClass} ${className}`}
    >
      {initial}
    </div>
  );
}
