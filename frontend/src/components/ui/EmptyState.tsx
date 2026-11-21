"use client";

interface EmptyStateProps {
  message: string;
  className?: string;
}

export function EmptyState({ message, className = "" }: EmptyStateProps) {
  return (
    <div className={`p-8 text-center text-xs text-revix-secondary ${className}`}>
      {message}
    </div>
  );
}
