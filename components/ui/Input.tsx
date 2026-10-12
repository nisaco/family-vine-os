import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, type, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || props.name || generatedId;
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === 'password';
    const computedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-stone-700"
        >
          {label}
          {props.required && <span className="text-rose-600 ml-1">*</span>}
        </label>
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={computedType}
            className={`min-h-11 w-full rounded-lg border bg-white px-3.5 py-2.5 text-base text-stone-900 placeholder-stone-400 transition-colors focus:outline-none focus:ring-2 sm:text-sm ${
              isPassword ? 'pr-11' : ''
            } ${
              error
                ? 'border-rose-400 focus:ring-rose-500'
                : 'border-stone-300 hover:border-stone-400 focus:border-choir-700 focus:ring-choir-700'
            } ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 transition-colors rounded focus:outline-none focus:text-stone-900"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-stone-600" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-sm font-medium text-rose-700" role="alert">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-stone-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
