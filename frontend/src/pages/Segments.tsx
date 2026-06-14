import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Sparkles, 
  Loader2, 
  AlertCircle,
  Eye,
  Save,
  X,
  Compass,
  Tag
} from 'lucide-react';
import { Card } from '../components/Card';

interface Segment {
  id: string;
  name: string;
  description: string | null;
  rules: any;
  createdAt: string;
}

interface ParsedResult {
  rules: any;
  explanation: string;
  matchCount: number;
}

interface SegmentCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  age: number;
  totalSpend: number;
}

const Segments: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // States
  const [prompt, setPrompt] = useState('');
  const [parseResult, setParseResult] = useState<ParsedResult | null>(null);
  const [segmentName, setSegmentName] = useState('');
  const [segmentDesc, setSegmentDesc] = useState('');
  const [showPromptBox, setShowPromptBox] = useState(false);
  
  // Modals / Drawer
  const [activeSegmentCustomers, setActiveSegmentCustomers] = useState<SegmentCustomer[] | null>(null);
  const [viewingSegmentName, setViewingSegmentName] = useState('');
  
  // Loading
  const [aiParsing, setAiParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const promptChips = [
    { label: '🔥 VIP Spenders', text: 'Find customers who spent more than 2000' },
    { label: '⌛ Inactive (90d)', text: 'Find customers who have not purchased in 90 days' },
    { label: '🇬🇧 London Gen-Z', text: 'Find customers living in London and younger than 25' },
    { label: '🇺🇸 LA Spenders', text: 'Find customers living in Los Angeles who spent more than 1500' }
  ];

  // Fetch segments
  const { data: segments, isLoading } = useQuery<Segment[]>({
    queryKey: ['segments'],
    queryFn: async () => {
      const res = await api.get('/segments');
      return res.data;
    }
  });

  // View customer list
  const viewCustomersMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      setViewingSegmentName(name);
      const res = await api.get(`/segments/${id}/customers`);
      return res.data;
    },
    onSuccess: (data) => {
      setActiveSegmentCustomers(data);
      toast(`Loaded ${data.length} segment members`, 'success');
    },
    onError: () => {
      toast('Error loading segment members', 'error');
    }
  });

  // AI Parse prompt
  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      setErrorMsg(null);
      setAiParsing(true);
      const res = await api.post('/segments/parse', { prompt: text });
      return res.data;
    },
    onSuccess: (data) => {
      setParseResult(data);
      setSegmentName(`Segment: ${prompt.slice(0, 25)}...`);
      setSegmentDesc(data.explanation);
      toast('Cohort rules calculated successfully', 'success');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Segment query parsing failed.';
      setErrorMsg(msg);
      toast(msg, 'error');
    },
    onSettled: () => {
      setAiParsing(false);
    }
  });

  // Save Segment
  const saveMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string; rules: any }) => {
      return api.post('/segments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      queryClient.invalidateQueries({ queryKey: ['segments-dropdown'] });
      setPrompt('');
      setParseResult(null);
      setSegmentName('');
      setSegmentDesc('');
      setShowPromptBox(false);
      toast('Segment saved successfully', 'success');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Failed to save segment.';
      setErrorMsg(msg);
      toast(msg, 'error');
    }
  });

  const handleAISubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    parseMutation.mutate(prompt);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!segmentName || !parseResult) return;
    saveMutation.mutate({
      name: segmentName,
      description: segmentDesc,
      rules: parseResult.rules
    });
  };

  const renderRules = (rules: any) => {
    if (!rules) return 'No criteria specified';
    const keys = Object.keys(rules);
    if (keys.length === 0) return 'All shoppers';
    
    return keys.map((key) => {
      const val = rules[key];
      if (typeof val === 'object' && val !== null) {
        const op = Object.keys(val)[0];
        const operators: Record<string, string> = { gt: '>', gte: '>=', lt: '<', lte: '<=', equals: '=' };
        return `${key} ${operators[op] || op} ${val[op]}`;
      }
      return `${key} = ${val}`;
    }).join(' AND ');
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Segments</h2>
          <p className="text-xs text-slate-500 mt-1 font-sans">Build, filter, and save customer cohorts based on shopping rules.</p>
        </div>

        <button
          onClick={() => {
            setShowPromptBox(!showPromptBox);
            setParseResult(null);
            setErrorMsg(null);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-755 text-white rounded text-xs font-semibold shadow-xs transition"
        >
          {showPromptBox ? 'Close Builder' : 'Create Segment'}
        </button>
      </div>

      {/* Notion style builder prompt box */}
      {showPromptBox && (
        <Card className="space-y-4 border border-slate-200 shadow-xs p-5 bg-white select-none">
          <div>
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Describe Target Segment</h3>
            <p className="text-slate-400 text-[10px] mt-0.5">Filter shopper rules instantly using standard description filters.</p>
          </div>

          <form onSubmit={handleAISubmit} className="space-y-4 font-sans">
            <textarea
              rows={3}
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Find customers who spent more than 2000 or are living in Los Angeles..."
              className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs leading-relaxed"
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mr-1">
                <Compass className="h-3.5 w-3.5 text-slate-400" />
                Quick Presets:
              </span>
              {promptChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(chip.text)}
                  className="px-2.5 py-1 text-[10px] font-semibold text-slate-550 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={aiParsing}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {aiParsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate Segment
              </button>
            </div>
          </form>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-750 text-xs rounded flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Rules generation output and save box */}
          {parseResult && (
            <div className="p-5 border border-slate-200 rounded bg-slate-50/50 space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Matched Profiles</span>
                  <p className="text-base font-bold text-slate-805 mt-0.5">{parseResult.matchCount} shoppers matched</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Rule Metrics</span>
                  <p className="text-xs font-mono text-slate-650 mt-0.5 bg-white border border-slate-200 p-2 rounded truncate">
                    {JSON.stringify(parseResult.rules)}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSubmit} className="pt-4 border-t border-slate-200 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Segment Name</label>
                    <input
                      type="text"
                      required
                      value={segmentName}
                      onChange={(e) => setSegmentName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-slate-700 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-550 uppercase text-[10px]">Description</label>
                    <input
                      type="text"
                      required
                      value={segmentDesc}
                      onChange={(e) => setSegmentDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setParseResult(null)}
                    className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded font-semibold"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Segment
                  </button>
                </div>
              </form>
            </div>
          )}
        </Card>
      )}

      {/* Cohorts grid list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-650" />
        </div>
      ) : segments?.length === 0 ? (
        <div className="p-16 text-center text-slate-450 text-xs border border-dashed border-slate-200 bg-white rounded-lg select-none">
          No saved segment cohorts found. Click "Create Segment" to draft a new cohort group.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 select-none">
          {segments?.map((seg) => (
            <Card key={seg.id} className="flex flex-col justify-between border border-slate-200 hover:border-slate-350 p-5 h-44 hover:shadow-md transition bg-white rounded-lg group">
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider group-hover:text-blue-600 transition-colors">{seg.name}</h4>
                <p className="text-slate-500 text-[10px] mt-1.5 line-clamp-2 leading-relaxed">
                  {seg.description || 'No description provided.'}
                </p>
                
                <div className="mt-3 bg-slate-50 px-2 rounded border border-slate-100 text-[9px] text-slate-650 font-mono truncate">
                  {renderRules(seg.rules)}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-3 shrink-0">
                <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-slate-400" />
                  Target group
                </span>
                
                <button
                  onClick={() => viewCustomersMutation.mutate({ id: seg.id, name: seg.name })}
                  disabled={viewCustomersMutation.isPending}
                  className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded shadow-xs transition"
                >
                  <Eye className="h-3.5 w-3.5 text-slate-400" />
                  View Members
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Matched members drawer list */}
      {activeSegmentCustomers && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn select-none">
          <div onClick={() => setActiveSegmentCustomers(null)} className="fixed inset-0 bg-slate-900/10 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between z-10">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{viewingSegmentName}</h3>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">cohort members ({activeSegmentCustomers.length})</span>
                </div>
                <button 
                  onClick={() => setActiveSegmentCustomers(null)}
                  className="p-1 rounded-md hover:bg-slate-50 text-slate-400 border border-slate-150"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer members list */}
              {activeSegmentCustomers.length === 0 ? (
                <p className="text-xs text-slate-450 italic">No matching customers found.</p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white text-xs">
                  {activeSegmentCustomers.map((c) => (
                    <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{c.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 font-mono">{c.city}</span>
                        <p className="font-bold text-slate-700 mt-0.5 font-mono">{formatCurrency(c.totalSpend)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={() => setActiveSegmentCustomers(null)}
                className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded shadow-xs transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(val);
};

export default Segments;
