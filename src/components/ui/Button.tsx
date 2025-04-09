'use client';

import React from 'react';

// Define simple UI components since the imported ones aren't available
export const Button = ({ 
  children, 
  variant, 
  size, 
  asChild, 
  onClick 
}: { 
  children: React.ReactNode; 
  variant?: string; 
  size?: string; 
  asChild?: boolean; 
  onClick?: () => void; 
}) => {
  const className = `
    ${variant === 'destructive' ? 'bg-red-500 hover:bg-red-600 text-white' : 
      variant === 'outline' ? 'border border-gray-300 hover:bg-gray-100' : 
      'bg-blue-500 hover:bg-blue-600 text-white'}
    ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'}
    rounded-md font-medium transition-colors
  `;

  if (asChild) {
    // If asChild is true, render the children directly within a div with the calculated class names.
    // This allows the Button to act as a wrapper passing styles to its child.
    return <div className={className}>{children}</div>;
  }

  // Otherwise, render a standard button element.
  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;
