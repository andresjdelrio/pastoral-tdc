import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'teal' | 'gray';
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  className = ''
}: KpiCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'teal':
        return 'bg-brand-teal text-white';
      case 'gray':
        return 'bg-brand-grayRow text-brand-text';
      default:
        return 'bg-white text-brand-text border shadow-sm';
    }
  };

  return (
    <div className={`rounded-2xl p-6 ${getVariantStyles()} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium opacity-90 mb-1">{title}</h3>
          <div className="text-2xl font-bold mb-1">{value}</div>
          {subtitle && (
            <p className="text-sm opacity-75">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="ml-4 opacity-75">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}