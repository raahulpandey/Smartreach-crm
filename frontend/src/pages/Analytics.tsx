import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Loader2, 
  AlertCircle, 
  TrendingUp,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Card } from '../components/Card';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../components/Table';
import { AreaChart, BarChart } from '../components/Chart';

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

const Analytics: React.FC = () => {
  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['analytics-detailed'],
    queryFn: async () => {
      const res = await api.get('/analytics');
      return res.data;
    },
    refetchInterval: 5000 // Poll every 5s to keep it reactive
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-xs text-slate-500 font-semibold">Loading merchant analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 flex items-start gap-4 max-w-2xl mx-auto my-8">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-sm">Error loading analytics</h3>
          <p className="text-xs mt-1">Please ensure the backend CRM service is running and accessible.</p>
        </div>
      </div>
    );
  }

  const { overview, campaignPerformance, conversionGraph } = data;

  // Process Channel-specific aggregate data (Email, SMS, WhatsApp, RCS)
  const channelStatsMap: Record<string, { sent: number; delivered: number; opened: number; clicked: number; converted: number }> = {
    EMAIL: { sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 },
    SMS: { sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 },
    WHATSAPP: { sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 },
    RCS: { sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 }
  };

  campaignPerformance.forEach(camp => {
    const channel = camp.channel;
    if (channelStatsMap[channel]) {
      channelStatsMap[channel].sent += camp.sent;
      channelStatsMap[channel].delivered += camp.delivered;
      channelStatsMap[channel].opened += camp.opened;
      channelStatsMap[channel].clicked += camp.clicked;
      channelStatsMap[channel].converted += camp.converted;
    }
  });

  const channelComparisonData = Object.keys(channelStatsMap).map(channel => {
    const stats = channelStatsMap[channel];
    const total = stats.sent || 1;
    const delivered = stats.delivered || 1;
    const opened = stats.opened || 1;
    
    return {
      channel,
      'Delivery Rate': Math.round((stats.delivered / total) * 100),
      'Open Rate': Math.round((stats.opened / delivered) * 100),
      'Click Rate': Math.round((stats.clicked / opened) * 100),
      'Conversion Rate': Math.round((stats.converted / (stats.clicked || 1)) * 150)
    };
  });

  // Calculate top rates
  const counts = overview.counts;
  const deliveryPct = counts.sent > 0 ? Math.round((counts.delivered / counts.sent) * 100) : 0;
  const openPct = counts.delivered > 0 ? Math.round((counts.opened / counts.delivered) * 100) : 0;
  const conversionPct = counts.clicked > 0 ? Math.round((counts.converted / counts.clicked) * 100) : 0;

  return (
    <div className="space-y-6 select-none font-sans max-w-[1200px] mx-auto w-full">
      {/* Header Row */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Merchant Analytics</h2>
          <p className="text-xs text-slate-500 mt-1">Real-time engagement metrics, conversion funnels, and channel performance</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded shadow-xs flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync Active
          </span>
        </div>
      </div>

      {/* 3 Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="flex items-center justify-between h-28 border border-slate-200 p-5 hover:shadow-md transition bg-white rounded-lg">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivery Success Rate</span>
            <h4 className="text-2xl font-extrabold text-blue-600 mt-1.5">{deliveryPct}%</h4>
            <span className="text-[10px] text-slate-450 mt-1 block">Sent messages reaching users</span>
          </div>
          <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-md text-blue-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between h-28 border border-slate-200 p-5 hover:shadow-md transition bg-white rounded-lg">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Open Rate</span>
            <h4 className="text-2xl font-extrabold text-amber-500 mt-1.5">{openPct}%</h4>
            <span className="text-[10px] text-slate-450 mt-1 block">Messages opened by shoppers</span>
          </div>
          <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-md text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between h-28 border border-slate-200 p-5 hover:shadow-md transition bg-white rounded-lg">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Conversion Rate</span>
            <h4 className="text-2xl font-extrabold text-rose-500 mt-1.5">{conversionPct}%</h4>
            <span className="text-[10px] text-slate-450 mt-1 block">Clicked links completing sales</span>
          </div>
          <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-md text-rose-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Timelines and Channel Comparisons grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign conversion timeline area chart */}
        <Card className="space-y-4 border border-slate-200 p-5 bg-white rounded-lg">
          <div>
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Conversion & Revenue Trends</h3>
            <p className="text-slate-400 text-[10px] mt-0.5">Chronological progress tracking customer purchases and sales conversions</p>
          </div>
          <div className="pt-2">
            <AreaChart 
              data={conversionGraph} 
              xKey="date" 
              yKeys={['conversions', 'revenue']} 
              colors={['#f43f5e', '#2563eb']} 
              height={260} 
            />
          </div>
        </Card>

        {/* Channel comparison bar chart */}
        <Card className="space-y-4 border border-slate-200 p-5 bg-white rounded-lg">
          <div>
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Channel Performance Comparison</h3>
            <p className="text-slate-400 text-[10px] mt-0.5">Aggregate performance metrics mapped across marketing channels</p>
          </div>
          <div className="pt-2">
            <BarChart 
              data={channelComparisonData} 
              xKey="channel" 
              yKeys={['Delivery Rate', 'Open Rate', 'Click Rate', 'Conversion Rate']} 
              colors={['#2563eb', '#f43f5e', '#f59e0b', '#10b981']}
              height={260} 
            />
          </div>
        </Card>
      </div>

      {/* Campaigns Scorecard Table */}
      <Card className="space-y-4 border border-slate-200 p-5 bg-white rounded-lg">
        <div>
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Campaign Performance Leaderboard</h3>
          <p className="text-slate-400 text-[10px] mt-0.5">Complete marketing breakdown and engagement metrics comparison</p>
        </div>

        {campaignPerformance.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
            No marketing broadcasts run yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Campaign Name</TableCell>
                <TableCell isHeader>Channel</TableCell>
                <TableCell isHeader className="text-center">Delivered</TableCell>
                <TableCell isHeader className="text-center">Opened</TableCell>
                <TableCell isHeader className="text-center">Clicked</TableCell>
                <TableCell isHeader className="text-center">Converted</TableCell>
                <TableCell isHeader className="text-center">Open Rate</TableCell>
                <TableCell isHeader className="text-center">CTR</TableCell>
                <TableCell isHeader className="text-center">Conversion</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignPerformance.map((camp) => (
                <TableRow key={camp.id}>
                  <TableCell className="font-bold text-slate-900">{camp.name}</TableCell>
                  <TableCell className="uppercase text-slate-500 tracking-wider font-semibold">{camp.channel}</TableCell>
                  <TableCell className="text-center text-slate-600 font-medium">{camp.delivered}</TableCell>
                  <TableCell className="text-center text-slate-600 font-medium">{camp.opened}</TableCell>
                  <TableCell className="text-center text-slate-600 font-medium">{camp.clicked}</TableCell>
                  <TableCell className="text-center text-emerald-600 font-bold">{camp.converted}</TableCell>
                  <TableCell className="text-center font-bold text-slate-700">{camp.rates.openRate}%</TableCell>
                  <TableCell className="text-center font-bold text-slate-700">{camp.rates.clickRate}%</TableCell>
                  <TableCell className="text-center font-extrabold text-blue-600">{camp.rates.conversionRate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default Analytics;
