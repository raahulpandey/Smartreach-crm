import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart as RechartsAreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart as RechartsBarChart,
  Bar
} from 'recharts';

interface ChartProps {
  data: any[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  height?: number;
}

export const AreaChart: React.FC<ChartProps> = ({ 
  data, 
  xKey, 
  yKeys, 
  colors = ['#2563eb', '#10b981'], 
  height = 300 
}) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={10} tickLine={false} />
          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              boxShadow: '0 2px 4px 0 rgba(0,0,0,0.03)' 
            }}
            labelStyle={{ color: '#64748b', fontWeight: 'bold', fontSize: '11px' }}
            itemStyle={{ fontSize: '11px' }}
          />
          {yKeys.map((key, idx) => (
            <Area 
              key={key}
              type="monotone" 
              dataKey={key} 
              stroke={colors[idx % colors.length]} 
              strokeWidth={1.5}
              fillOpacity={0.04} 
              fill={colors[idx % colors.length]} 
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const BarChart: React.FC<ChartProps> = ({ 
  data, 
  xKey, 
  yKeys, 
  colors = ['#2563eb', '#10b981', '#f59e0b', '#ec4899'], 
  height = 300 
}) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={10} tickLine={false} />
          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              boxShadow: '0 2px 4px 0 rgba(0,0,0,0.03)' 
            }}
            labelStyle={{ color: '#64748b', fontWeight: 'bold', fontSize: '11px' }}
            itemStyle={{ fontSize: '11px' }}
          />
          <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
          {yKeys.map((key, idx) => (
            <Bar 
              key={key}
              dataKey={key} 
              fill={colors[idx % colors.length]} 
              radius={[3, 3, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};
