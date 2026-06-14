import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div className="w-full overflow-x-auto custom-scrollbar">
      <table className={`w-full border-collapse text-left text-sm text-slate-700 ${className}`}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <thead className={`border-b border-slate-200 text-xs font-semibold text-slate-550 uppercase tracking-wider bg-slate-50/50 ${className}`}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<TableProps> = ({ children, className = '' }) => {
  return <tbody className={`divide-y divide-slate-100 ${className}`}>{children}</tbody>;
};

export const TableRow: React.FC<TableProps & { onClick?: () => void }> = ({ children, className = '', onClick }) => {
  return (
    <tr 
      onClick={onClick} 
      className={`transition-colors hover:bg-slate-50/50 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
};

export const TableCell: React.FC<TableProps & { isHeader?: boolean; colSpan?: number; onClick?: (e: React.MouseEvent) => void }> = ({ 
  children, 
  className = '', 
  isHeader = false,
  colSpan,
  onClick
}) => {
  const Tag = isHeader ? 'th' : 'td';
  return (
    <Tag 
      colSpan={colSpan}
      onClick={onClick}
      className={`py-3 px-4 align-middle whitespace-nowrap ${
        isHeader ? 'font-bold text-slate-500 text-[10px]' : 'text-slate-700 text-xs'
      } ${className}`}
    >
      {children}
    </Tag>
  );
};
