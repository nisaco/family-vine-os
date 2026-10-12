'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'min-h-9 px-3 py-1.5 text-xs',
    md: 'min-h-10 px-4 py-2 text-sm',
    lg: 'min-h-11 px-5 py-2.5 text-base',
  };

  const variantStyles = {
    primary:
      'bg-choir-800 text-white hover:bg-choir-900 focus-visible:ring-choir-800 active:bg-choir-950 shadow-sm',
    secondary:
      'bg-stone-100 text-stone-800 hover:bg-stone-200 focus-visible:ring-stone-400 border border-stone-200',
    outline:
      'border border-choir-800 text-choir-900 hover:bg-choir-50 focus-visible:ring-choir-700',
    danger:
      'bg-rose-700 text-white hover:bg-rose-800 focus-visible:ring-rose-600 active:bg-rose-900 shadow-sm',
    ghost:
      'text-stone-700 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-stone-400',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>{loadingText || 'Processing...'}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export interface SubmitButtonProps extends Omit<ButtonProps, 'type' | 'isLoading'> {
  loadingText?: string;
}

export function SubmitButton({
  children,
  loadingText,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      isLoading={pending}
      loadingText={loadingText}
      disabled={disabled || pending}
      {...props}
    >
      {children}
    </Button>
  );
}
