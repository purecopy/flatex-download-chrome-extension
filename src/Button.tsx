import React from 'react';
import './Button.css';

type ButtonProps = {
  loading?: boolean;
};

export function Button({
  className = '',
  disabled,
  loading,
  children,
  ...rest
}: ButtonProps & React.ComponentProps<'button'>): JSX.Element {
  return (
    <button
      className={`Button ${className} ${loading ? 'Button-loading' : ''} ${disabled ? 'Button-disabled' : ''}`}
      disabled={disabled}
      {...rest}
    >
      {loading ? <div className="ButtonLoadingLabel">Loading...</div> : null}
      {children}
    </button>
  );
}
