import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Users, 
  DollarSign, 
  Send, 
  Percent, 
  Loader2, 
  AlertCircle, 
  RefreshCw
} from 'lucide-react';
import { Card } from '../components/Card';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../components/Table';
import { AreaChart } from '../components/Chart';

interface AnalyticsData {
  overview: {
    totalCustomers: number;
    totalRevenue: number;
    totalCampaigns: number;
    counts: {
      sent: number;
      delivered: number;
      failed: number;
      opened: number;
      clicked: number;
      converted: number;
    };
    deliveryRate: number;
  };
  campaignPerformance: any[];
  conversionGraph: { date: string; conversions: number; revenue: number }[];
}

const Dashboard: React.FC = () => {
  const { toast } = useToast();
  const { data, isLoading, error, refetch, isRefetching } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await api.get('/analytics');
      return res.data;
    },
    refetchInterval: 5000 // Poll every 5s to keep it reactive
  });

  const handleSync = async () => {
    try {
      await refetch();
      toast('Workspace synced successfully', 'success');
    } catch {
      toast('Failed to sync metrics', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-650" />
          <span className="text-xs text-slate-500 font-semibold">Loading dashboard metrics...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 flex items-start gap-4 max-w-2xl mx-auto my-8">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-sm">Failed to retrieve analytics</h3>
          <p className="text-xs mt-1">Please ensure the backend CRM service is running and accessible.</p>
          <button 
            onClick={() => refetch()} 
            className="mt-3 px-3 py-1.5 bg-white hover:bg-slate-55 text-slate-700 text-xs font-semibold border border-slate-200 rounded shadow-xs transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { overview, conversionGraph, campaignPerformance } = data;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // 4 KPI Cards
  const kpiData = [
    {
      title: 'Customer',
      value: overview.totalCustomers,
      icon: Users,
      trend: '+8% growth',
      color: 'text-blue-600 bg-blue-50 border-blue-100'
    },
    {
      title: 'Revenue',
      value: formatCurrency(overview.totalRevenue),
      icon: DollarSign,
      trend: '+12% this month',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
    },
    {
      title: 'Campaigns',
      value: overview.totalCampaigns,
      icon: Send,
      trend: 'Active templates',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100'
    },
    {
      title: 'Delivery',
      value: `${overview.deliveryRate}%`,
      icon: Percent,
      trend: 'Avg success rate',
      color: 'text-amber-600 bg-amber-50 border-amber-100'
    }
  ];

  // Derive campaign summary detail
  const latestCampaign = campaignPerformance[0] || null;

  return (
    <div className="space-y-6 select-none max-w-[1200px] mx-auto w-full">
      {/* Header Row */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Welcome back, Admin</h2>
          <p className="text-xs text-slate-500 mt-1">Here is a quick overview of your workspace customer analytics and message statistics.</p>
        </div>

        <button 
          onClick={handleSync} 
          disabled={isRefetching}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold shadow-xs transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      {/* 4 Cards Row: repeat(4, 1fr) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="flex flex-col justify-between h-28 border border-slate-200 p-5 hover:shadow-md transition bg-white rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.title}</span>
                <div className={`p-1.5 rounded border ${kpi.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900 tracking-tight leading-none">{kpi.value}</h4>
                <p className="text-[9px] text-slate-450 font-semibold mt-1.5">{kpi.trend}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Two Column Layout: Chart (LEFT) & Campaign Summary (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-stretch">
        {/* LEFT: Chart card (70% on large viewports) */}
        <Card className="lg:col-span-7 space-y-4 border border-slate-200 p-5 bg-white rounded-lg flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Conversion Revenue Trend</h3>
            <p className="text-slate-450 text-[10px] mt-0.5">Timeline overview of conversions and total sales revenue</p>
          </div>
          <div className="pt-2">
            <AreaChart 
              data={conversionGraph} 
              xKey="date" 
              yKeys={['revenue']} 
              colors={['#2563eb']} 
              height={230} 
            />
          </div>
        </Card>

        {/* RIGHT: Campaign summary (30%) */}
        <Card className="lg:col-span-3 space-y-4 border border-slate-200 p-5 bg-white rounded-lg flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Campaign Summary</h3>
            <p className="text-slate-450 text-[10px] mt-0.5">Engagement metrics of your latest dispatch</p>
          </div>

          {latestCampaign ? (
            <div className="space-y-3 pt-2 text-xs flex-1">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900 truncate pr-2">{latestCampaign.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase shrink-0">
                  {latestCampaign.channel}
                </span>
              </div>
              <div className="space-y-1.5 text-slate-600">
                <p className="flex justify-between"><span>Audience Segment:</span> <span className="font-bold text-slate-800">{latestCampaign.segment?.name || 'All'}</span></p>
                <p className="flex justify-between"><span>Total Dispatched:</span> <span className="font-bold text-slate-800">{latestCampaign.sent}</span></p>
                <p className="flex justify-between"><span>Conversion Rate:</span> <span className="font-bold text-emerald-600 font-mono">{latestCampaign.rates.conversionRate}%</span></p>
                <p className="flex justify-between"><span>CTR Performance:</span> <span className="font-bold text-blue-600 font-mono">{latestCampaign.rates.clickRate}%</span></p>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-[10px] text-slate-550 italic leading-relaxed line-clamp-3">
                "{latestCampaign.message}"
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-xs text-slate-400 italic">
              No recent campaigns dispatched yet.
            </div>
          )}
        </Card>
      </div>

      {/* Recent campaigns table */}
      <Card className="space-y-4 border border-slate-200 p-5 bg-white rounded-lg">
        <div>
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Recent Dispatched Campaigns</h3>
          <p className="text-slate-450 text-[10px] mt-0.5">Campaign templates dispatched and delivery metrics logs</p>
        </div>

        {campaignPerformance.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
            No marketing dispatches created yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Campaign Name</TableCell>
                <TableCell isHeader>Channel</TableCell>
                <TableCell isHeader className="text-center">Audience Size</TableCell>
                <TableCell isHeader>Status</TableCell>
                <TableCell isHeader className="text-right font-bold">CTR Rate</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignPerformance.slice(0, 5).map((camp) => {
                const statusStyles: Record<string, string> = {
                  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
                  SENDING: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
                  SENT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  FAILED: 'bg-rose-50 text-rose-700 border-rose-200'
                };

                return (
                  <TableRow key={camp.id}>
                    <TableCell className="font-bold text-slate-900">{camp.name}</TableCell>
                    <TableCell className="text-slate-550 uppercase tracking-wider font-semibold">{camp.channel}</TableCell>
                    <TableCell className="text-center text-slate-650">{camp.sent} profiles</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusStyles[camp.status]}`}>
                        {camp.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-blue-650 font-extrabold">{camp.rates.clickRate}% CTR</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
