import React from 'react';

interface ReportsNavigationHeaderProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  rightAction?: React.ReactNode;
  activeTab?: string;
}

export const ReportsNavigationHeader: React.FC<ReportsNavigationHeaderProps> = ({
  title,
  description,
  icon: Icon,
  rightAction,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <Icon className="w-5 h-5 text-indigo-600 shrink-0" />
          <span>{title}</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          {description}
        </p>
      </div>

      {rightAction && <div className="shrink-0 self-stretch sm:self-auto">{rightAction}</div>}
    </div>
  );
};

export default ReportsNavigationHeader;
