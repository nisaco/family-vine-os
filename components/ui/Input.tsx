import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || props.name || generatedId;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-stone-700"
        >
          {label}
          {props.required && <span className="text-rose-600 ml-1">*</span>}
        </label>
        <input
          id={inputId}
          ref={ref}
          className={`min-h-11 w-full rounded-lg border bg-white px-3.5 py-2.5 text-base text-stone-900 placeholder-stone-400 transition-colors focus:outline-none focus:ring-2 sm:text-sm ${
            error
              ? 'border-rose-400 focus:ring-rose-500'
              : 'border-stone-300 hover:border-stone-400 focus:border-choir-700 focus:ring-choir-700'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm font-medium text-rose-700" role="alert">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-stone-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
