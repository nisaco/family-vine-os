import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
}: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_3px_rgba(28,25,23,0.04)] ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 border-b border-stone-100 px-5 py-4 sm:px-6">
          <div>
            {title && (
              <h3 className="text-base font-semibold leading-snug text-stone-900">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}
