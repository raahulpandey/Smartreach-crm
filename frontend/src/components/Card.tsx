import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-xl p-6 shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-350 hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
