import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Plus, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  Eye, 
  Rocket, 
  X,
  Smartphone
} from 'lucide-react';
import { Card } from '../components/Card';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../components/Table';

interface Segment {
  id: string;
  name: string;
  description: string;
}

interface Campaign {
  id: string;
  name: string;
  segmentId: string;
  channel: string;
  message: string;
  status: 'DRAFT' | 'SENDING' | 'SENT' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  segment: { name: string };
  _count: { communications: number };
}

const PreviewMockup: React.FC<{
  channel: string;
  campaignName: string;
  message: string;
}> = ({ channel, campaignName, message }) => {
  const formatMessage = (msg: string) => {
    if (!msg) return "Write your message to see a live preview bubble...";
    return msg.replace(/\[Customer Name\]/g, "John Doe");
  };

  if (channel === 'EMAIL') {
    return (
      <div className="w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs text-xs select-none">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-200">
          <div className="w-2 h-2 rounded-full bg-slate-300" />
          <div className="w-2 h-2 rounded-full bg-slate-300" />
          <div className="w-2 h-2 rounded-full bg-slate-300" />
          <span className="text-[9px] text-slate-400 ml-2 font-mono">email-client</span>
        </div>
        <div className="p-3.5 space-y-2">
          <div className="pb-1.5 border-b border-slate-100 space-y-0.5 text-slate-500">
            <p><span className="font-semibold w-10 inline-block text-[10px]">From:</span> info@smartreach.ai</p>
            <p><span className="font-semibold w-10 inline-block text-[10px]">Subject:</span> {campaignName || '(Untitled Campaign)'}</p>
          </div>
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-150 text-[10px]">
            {formatMessage(message)}
          </p>
        </div>
      </div>
    );
  }

  const isWA = channel === 'WHATSAPP';
  const isSMS = channel === 'SMS';

  return (
    <div className="w-[200px] mx-auto rounded-xl border border-slate-300 bg-slate-100 overflow-hidden shadow-sm relative flex flex-col h-[260px] text-[10px] select-none">
      <div className="px-3 py-2 bg-slate-250 border-b border-slate-300 text-center font-bold text-slate-700 uppercase tracking-wider shrink-0">
        {isWA ? 'WhatsApp' : isSMS ? 'SMS' : 'RCS'}
      </div>
      <div className="flex-1 p-3 flex flex-col justify-end space-y-2">
        {isWA ? (
          <div className="bg-[#e7fec7] text-slate-800 p-2.5 rounded-lg rounded-tr-none border border-[#dfefc0] self-end max-w-[90%] shadow-2xs">
            <p className="whitespace-pre-wrap leading-relaxed">{formatMessage(message)}</p>
          </div>
        ) : (
          <div className="bg-blue-600 text-white p-2.5 rounded-lg rounded-tr-none self-end max-w-[90%] shadow-2xs">
            <p className="whitespace-pre-wrap leading-relaxed">{formatMessage(message)}</p>
          </div>
        )}
        <span className="text-[7px] text-slate-400 text-right">Delivered</span>
      </div>
    </div>
  );
};

const Campaigns: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Form inputs
  const [campaignName, setCampaignName] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [channel, setChannel] = useState('EMAIL');
  const [message, setMessage] = useState('');
  const [aiGoal, setAiGoal] = useState('');

  // AI loading parameters
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // AI suggestions parameters
  const [suggestionsList, setSuggestionsList] = useState<{
    title: string;
    channel: string;
    message: string;
    rationale: string;
  }[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Fetch campaigns
  const { data: campaigns, isLoading: loadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await api.get('/campaigns');
      return res.data;
    },
    refetchInterval: 5000
  });

  // Fetch segments dropdown
  const { data: segments } = useQuery<Segment[]>({
    queryKey: ['segments-dropdown'],
    queryFn: async () => {
      const res = await api.get('/segments');
      return res.data;
    }
  });

  const { data: activeCampaignDetail } = useQuery({
    queryKey: ['campaign-detail', selectedCampaignId],
    queryFn: async () => {
      if (!selectedCampaignId) return null;
      const res = await api.get(`/campaigns/${selectedCampaignId}`);
      return res.data;
    },
    enabled: !!selectedCampaignId,
    refetchInterval: 5000
  });

  // Create Campaign draft
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/campaigns', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setShowCreateModal(false);
      resetForm();
      toast('Campaign draft created successfully', 'success');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Failed to create campaign draft.';
      setFormError(msg);
      toast(msg, 'error');
    }
  });

  // Launch campaign
  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/campaigns/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast('Campaign launched successfully!', 'success');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Error launching campaign.';
      toast(msg, 'error');
    }
  });

  const resetForm = () => {
    setCampaignName('');
    setSegmentId('');
    setChannel('EMAIL');
    setMessage('');
    setAiGoal('');
    setFormError(null);
    setSuggestionsList([]);
  };

  const handleGetSuggestions = async () => {
    if (!segmentId) {
      toast('Please select a segment first', 'info');
      return;
    }
    setFormError(null);
    setLoadingSuggestions(true);
    try {
      const res = await api.post('/campaigns/suggest-campaigns', { segmentId });
      const data = res.data;
      const items = Array.isArray(data) ? data : (data.suggestions || data.campaigns || []);
      setSuggestionsList(items);
      toast('AI campaign recommendations loaded', 'success');
    } catch (err: any) {
      console.error('Failed to get AI suggestions:', err);
      toast('Failed to generate suggestions strategy', 'error');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleApplySuggestion = (sug: any) => {
    setCampaignName(sug.title);
    setChannel(sug.channel || 'EMAIL');
    setMessage(sug.message);
    toast(`Applied recommendation: "${sug.title}"`, 'info');
  };

  const handleGenerateCopy = async () => {
    if (!campaignName || !segmentId || !channel) {
      setFormError('Please fill Campaign Name, Segment, and Channel first.');
      return;
    }
    setFormError(null);
    setGeneratingCopy(true);
    try {
      const selectedSeg = segments?.find(s => s.id === segmentId);
      const response = await api.post('/campaigns/generate-copy', {
        campaignName,
        segmentName: selectedSeg?.name || 'Target Audience',
        channel,
        description: aiGoal || 'Exclusive winback code'
      });
      setMessage(response.data.copy);
      toast('Message template generated', 'success');
    } catch (err: any) {
      setFormError('Failed to generate template copy.');
      toast('Failed to generate template copy', 'error');
    } finally {
      setGeneratingCopy(false);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!campaignName || !segmentId || !channel || !message) {
      setFormError('All fields (Name, Segment, Channel, and Message) are required.');
      return;
    }
    createMutation.mutate({
      name: campaignName,
      segmentId,
      channel,
      message
    });
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Campaign Dispatch</h2>
          <p className="text-xs text-slate-500 mt-1 font-sans">Manage marketing broadcasts, target segment cohorts, and check deliveries.</p>
        </div>

        <button
          onClick={() => { setShowCreateModal(true); resetForm(); }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Campaign
        </button>
      </div>

      {/* Directory table listing */}
      <Card className="p-0 overflow-hidden border border-slate-200 shadow-xs bg-white rounded-lg">
        {loadingCampaigns ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : campaigns?.length === 0 ? (
          <div className="py-16 text-center text-slate-450 text-xs bg-slate-50/50">
            No marketing broadcasts run. Launch "Create Campaign" to begin.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Campaign Name</TableCell>
                <TableCell isHeader>Channel</TableCell>
                <TableCell isHeader>Segment</TableCell>
                <TableCell isHeader className="text-center font-bold">Dispatched</TableCell>
                <TableCell isHeader>Status</TableCell>
                <TableCell isHeader className="text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns?.map((camp) => {
                const badgeStyles: Record<string, string> = {
                  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
                  SENDING: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
                  SENT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  FAILED: 'bg-rose-50 text-rose-700 border-rose-200'
                };

                return (
                  <TableRow key={camp.id} onClick={() => setSelectedCampaignId(camp.id)}>
                    <TableCell className="font-bold text-slate-900">{camp.name}</TableCell>
                    <TableCell className="text-slate-550 uppercase tracking-wider font-semibold">{camp.channel}</TableCell>
                    <TableCell className="text-slate-650">{camp.segment.name}</TableCell>
                    <TableCell className="text-center text-slate-600 font-mono font-bold">{camp._count.communications} shopper(s)</TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${badgeStyles[camp.status]}`}>
                        {camp.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {camp.status === 'DRAFT' && (
                          <button
                            onClick={() => sendMutation.mutate(camp.id)}
                            disabled={sendMutation.isPending}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold shadow-xs transition cursor-pointer"
                          >
                            {sendMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />}
                            Launch
                          </button>
                        )}
                        
                        <button
                          onClick={() => setSelectedCampaignId(camp.id)}
                          className="p-1.5 rounded border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* CREATE DIALOG MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn select-none">
          <div onClick={() => setShowCreateModal(false)} className="fixed inset-0 bg-slate-900/15" />
          <Card className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-lg p-6 shadow-2xl z-10 flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            {/* Left Column: Form inputs */}
            <div className="flex-1 space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                <h3 className="font-bold text-slate-900 text-sm">Create New Campaign</h3>
                <button onClick={() => setShowCreateModal(false)} className="md:hidden p-1 rounded hover:bg-slate-50 text-slate-400">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-md flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Campaign Name</label>
                  <input
                    type="text"
                    required
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. VIP Summer Discount"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Target Segment</label>
                    <select
                      value={segmentId}
                      required
                      onChange={(e) => setSegmentId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose Audience</option>
                      {segments?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Channel</label>
                    <select
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="EMAIL">Email</option>
                      <option value="SMS">SMS</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="RCS">RCS</option>
                    </select>
                  </div>
                </div>

                {/* AI Suggestions & Strategy Selector */}
                {segmentId && (
                  <div className="p-3 bg-indigo-50/50 border border-indigo-150 rounded space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-indigo-650 uppercase text-[9px] tracking-wider flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-650" />
                        AI Growth Suggestions
                      </label>
                      <button
                        type="button"
                        onClick={handleGetSuggestions}
                        disabled={loadingSuggestions}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold rounded shadow-xs transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        {loadingSuggestions ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Generate Concepts
                      </button>
                    </div>
                    {suggestionsList.length > 0 && (
                      <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {suggestionsList.map((sug, idx) => (
                          <div key={idx} className="p-2.5 bg-white border border-indigo-100 rounded-md space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-805 text-[10px]">{sug.title}</span>
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[8px] font-bold uppercase">{sug.channel}</span>
                            </div>
                            <p className="text-[9px] text-slate-500 leading-normal font-sans">{sug.rationale}</p>
                            <p className="text-[9px] text-slate-700 font-mono bg-slate-50 p-1.5 rounded truncate">{sug.message}</p>
                            <button
                              type="button"
                              onClick={() => handleApplySuggestion(sug)}
                              className="text-[9px] text-blue-650 hover:text-blue-700 font-bold flex items-center gap-0.5 mt-1 cursor-pointer"
                            >
                              Apply Concept Strategy
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* AI Copy Helpers */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                  <label className="font-bold text-slate-550 uppercase text-[9px] tracking-wider flex items-center gap-1 text-blue-600">
                    <Sparkles className="h-3 w-3" />
                    AI Template Helper
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiGoal}
                      onChange={(e) => setAiGoal(e.target.value)}
                      placeholder="e.g. Win-back promotion with 15% discount code"
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    />
                    <button
                      type="button"
                      disabled={generatingCopy}
                      onClick={handleGenerateCopy}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs transition shrink-0 flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      {generatingCopy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Write
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-550 uppercase text-[9px] tracking-wider">Message Content</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 leading-normal"
                    placeholder="Type your message copy. Use [Customer Name] to personalize."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-55 text-slate-600 rounded font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs transition"
                  >
                    Save Draft
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Message Preview */}
            <div className="hidden md:flex flex-col justify-center items-center w-64 border-l border-slate-100 pl-6 bg-slate-50/50 p-4 rounded-r-lg shrink-0">
              <div className="flex items-center gap-1.5 mb-4 text-slate-500">
                <Smartphone className="h-4.5 w-4.5" />
                <span className="text-xs font-semibold">Live Message Preview</span>
              </div>
              <PreviewMockup channel={channel} campaignName={campaignName} message={message} />
            </div>
          </Card>
        </div>
      )}

      {/* INSPECT DETAILS DRAWER */}
      {selectedCampaignId && activeCampaignDetail && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn select-none">
          <div onClick={() => setSelectedCampaignId(null)} className="fixed inset-0 bg-slate-900/10 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between z-10">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-805">{activeCampaignDetail.name}</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{activeCampaignDetail.channel} Campaign Detail</span>
                </div>
                <button 
                  onClick={() => setSelectedCampaignId(null)}
                  className="p-1 rounded-md hover:bg-slate-50 text-slate-400 border border-slate-150"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Status details */}
              <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Status</span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block uppercase">{activeCampaignDetail.status}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Audience size</span>
                  <span className="text-xs font-bold text-slate-850 mt-1 block">{activeCampaignDetail._count?.communications || 0} shopper(s)</span>
                </div>
              </div>

              {/* Message text copy */}
              <div className="space-y-1.5 text-xs font-sans">
                <h4 className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Message Content</h4>
                <div className="bg-slate-50 border border-slate-250 rounded p-3 text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {activeCampaignDetail.message}
                </div>
              </div>

              {/* Delivery logs details */}
              <div className="space-y-3 font-sans">
                <h4 className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Communications History</h4>
                {activeCampaignDetail.communications?.length === 0 ? (
                  <p className="text-xs text-slate-450 italic">No delivery traces recorded.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white overflow-hidden text-xs">
                    {activeCampaignDetail.communications?.map((comm: any) => (
                      <div key={comm.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-bold text-slate-800">{comm.customer?.name || 'Shopper'}</p>
                          <p className="text-[10px] text-slate-450 mt-0.5">{comm.customer?.email}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold border ${
                            comm.status === 'DELIVERED' || comm.status === 'CONVERTED' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : comm.status === 'FAILED' 
                              ? 'bg-rose-50 text-rose-700 border-rose-100'
                              : 'bg-blue-50 text-blue-700 border-blue-100'
                          }`}>
                            {comm.status}
                          </span>
                          <p className="text-[8px] text-slate-400 mt-1 font-medium">{new Date(comm.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={() => setSelectedCampaignId(null)}
                className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded shadow-xs transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
