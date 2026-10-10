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
      className={`bg-white border border-stone-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden ${className}`}
    >
      {(title || action) && (
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-stone-900 leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

