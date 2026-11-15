import React from 'react';
import { Colors, Radius } from '../../theme';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function Card({ children, style, ...rest }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: Colors.card,
        borderRadius: Radius.xl,
        padding: 16,
        border: `1px solid ${Colors.border}`,
        boxShadow: '0 4px 12px rgba(20, 32, 51, 0.04)',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1,
        ...style,
      }}
      {...rest}>
      {children}
    </div>
  );
}
