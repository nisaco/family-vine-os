import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(7);

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
        >
          {label}
          {props.required && <span className="text-rose-600 ml-1">*</span>}
        </label>
        <input
          id={inputId}
          ref={ref}
          className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-choir-700 transition-colors ${
            error
              ? 'border-rose-400 focus:ring-rose-500'
              : 'border-stone-300 hover:border-stone-400'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-rose-600 mt-1 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-stone-500 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

