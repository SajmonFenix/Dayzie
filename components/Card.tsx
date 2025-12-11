import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  delay?: number;
}

export const Card: React.FC<CardProps> = ({ title, children, icon, className = "", delay = 0 }) => {
  return (
    <div 
      className={`relative bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all duration-700 ease-out transform translate-y-0 opacity-100 hover:shadow-lg ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3 mb-4">
        {icon && <div className="text-indigo-600">{icon}</div>}
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      </div>
      <div className="text-slate-800 leading-relaxed">
        {children}
      </div>
    </div>
  );
};