import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { useToast } from '../context/ToastContext';
import { 
  Settings as SettingsIcon, 
  Database, 
  Radio, 
  ShieldAlert, 
  CheckCircle,
  Key,
  Lock,
  User,
  Sliders,
  RefreshCw,
  Play,
  Terminal,
  Trash2,
  Sparkles,
  Send,
  Loader2,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [workspaceName, setWorkspaceName] = useState('SmartReach AI Default Workspace');
  const [openaiKey, setOpenaiKey] = useState('sk-proj-••••••••••••••••••••••••');
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'access' | 'audit' | 'diagnostics'>('general');

  // Health check state
  const [healthData, setHealthData] = useState<{
    status: string;
    service: string;
    timestamp: string;
    db: string;
    channelService: string;
  } | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // Diagnostics states
  const [apiConsole, setApiConsole] = useState<{
    url: string;
    method: string;
    payload?: any;
    status?: number | string;
    response?: any;
    timestamp?: string;
  }[]>([]);
  
  // Forms inside diagnostics
  const [sampleCustomer, setSampleCustomer] = useState({
    name: 'Jane Diagnostics Doe',
    email: 'jane.doe.diag@example.com',
    phone: '+1-555-0199',
    city: 'New York',
    age: '28'
  });

  const [segmentPrompt, setSegmentPrompt] = useState('Find customers who spent more than 1500 and are younger than 35');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [campaignSuggestionsSegmentId, setCampaignSuggestionsSegmentId] = useState('');
  const [copyCampaignName, setCopyCampaignName] = useState('Holiday Boost');
  const [copySegmentName, setCopySegmentName] = useState('VIP Cohort');
  const [copyChannel, setCopyChannel] = useState('EMAIL');
  const [copyDescription, setCopyDescription] = useState('Offer 15% discount');

  // Webhook simulator fields
  const [webhookCommId, setWebhookCommId] = useState('');
  const [webhookStatus, setWebhookStatus] = useState('DELIVERED');

  // Dropdown options loaded for tester
  const [segmentsList, setSegmentsList] = useState<{ id: string; name: string }[]>([]);
  const [campaignsList, setCampaignsList] = useState<{ id: string; name: string }[]>([]);
  const [communicationsList, setCommunicationsList] = useState<{ id: string; customer: { name: string }; status: string }[]>([]);
  const [loadingComms, setLoadingComms] = useState(false);

  // Load health data on mount
  useEffect(() => {
    fetchHealth();
    loadDiagnosticsDropdowns();
  }, []);

  // Whenever selected campaign changes in webhook simulator, load its communications
  useEffect(() => {
    if (selectedCampaignId) {
      loadCampaignCommunications(selectedCampaignId);
    } else {
      setCommunicationsList([]);
      setWebhookCommId('');
    }
  }, [selectedCampaignId]);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await api.get('/health');
      setHealthData(res.data);
    } catch (err) {
      console.error('Failed to query system health:', err);
      setHealthData({
        status: 'degraded',
        service: 'crm-service',
        timestamp: new Date().toISOString(),
        db: 'DISCONNECTED',
        channelService: 'OFFLINE'
      });
    } finally {
      setLoadingHealth(false);
    }
  };

  const loadDiagnosticsDropdowns = async () => {
    try {
      const [segsRes, campsRes] = await Promise.all([
        api.get('/segments'),
        api.get('/campaigns')
      ]);
      setSegmentsList(segsRes.data || []);
      setCampaignsList(campsRes.data || []);
    } catch (err) {
      console.warn('Could not populate diagnostics dropdown data:', err);
    }
  };

  const loadCampaignCommunications = async (campId: string) => {
    setLoadingComms(true);
    try {
      const res = await api.get(`/campaigns/${campId}`);
      const comms = res.data?.communications || [];
      setCommunicationsList(comms);
      if (comms.length > 0) {
        setWebhookCommId(comms[0].id);
      } else {
        setWebhookCommId('');
      }
    } catch (err) {
      console.error('Failed to load campaign communications for webhook:', err);
    } finally {
      setLoadingComms(false);
    }
  };

  const logConsole = (url: string, method: string, payload: any, status: number | string, response: any) => {
    const entry = {
      url,
      method,
      payload,
      status,
      response,
      timestamp: new Date().toLocaleTimeString()
    };
    setApiConsole(prev => [entry, ...prev].slice(0, 10)); // keep last 10 entries
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    toast('Workspace settings updated successfully', 'success');
    setTimeout(() => setIsSaved(false), 3000);
  };

  // --- API TESTER EXECUTIONS ---

  const triggerHealthPing = async () => {
    try {
      const res = await api.get('/health');
      logConsole('/api/health', 'GET', null, res.status, res.data);
      setHealthData(res.data);
      toast('Health Check endpoint pinged successfully', 'success');
    } catch (err: any) {
      const responseErr = err.response?.data || err.message;
      const status = err.response?.status || 'ERROR';
      logConsole('/api/health', 'GET', null, status, responseErr);
      toast('Health check degraded or connection failed', 'error');
    }
  };

  const triggerFetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      logConsole('/api/customers', 'GET', null, res.status, {
        recordCount: res.data?.length || 0,
        sampleItem: res.data?.[0] || 'No records found'
      });
      toast('Successfully retrieved customers directory', 'success');
    } catch (err: any) {
      logConsole('/api/customers', 'GET', null, err.response?.status || 'ERROR', err.response?.data || err.message);
      toast('Failed to query customers endpoint', 'error');
    }
  };

  const triggerCreateCustomer = async () => {
    try {
      const payload = {
        ...sampleCustomer,
        age: parseInt(sampleCustomer.age, 10) || 30
      };
      const res = await api.post('/customers', payload);
      logConsole('/api/customers', 'POST', payload, res.status, res.data);
      toast('Sample test customer inserted successfully', 'success');
      loadDiagnosticsDropdowns(); // refresh lists
    } catch (err: any) {
      logConsole('/api/customers', 'POST', sampleCustomer, err.response?.status || 'ERROR', err.response?.data || err.message);
      toast(err.response?.data?.error || 'Failed to create customer', 'error');
    }
  };

  const triggerParseSegment = async () => {
    try {
      const payload = { prompt: segmentPrompt };
      const res = await api.post('/segments/parse', payload);
      logConsole('/api/segments/parse', 'POST', payload, res.status, res.data);
      toast('Natural language cohort criteria calculated', 'success');
    } catch (err: any) {
      logConsole('/api/segments/parse', 'POST', { prompt: segmentPrompt }, err.response?.status || 'ERROR', err.response?.data || err.message);
      toast('AI prompt parsing failed', 'error');
    }
  };

  const triggerFetchSegments = async () => {
    try {
      const res = await api.get('/segments');
      logConsole('/api/segments', 'GET', null, res.status, res.data);
      toast('Fetched segments list', 'success');
    } catch (err: any) {
      logConsole('/api/segments', 'GET', null, err.response?.status || 'ERROR', err.response?.data || err.message);
      toast('Failed to fetch segments', 'error');
    }
  };

  const triggerFetchCampaigns = async () => {
    try {
      const res = await api.get('/campaigns');
      logConsole('/api/campaigns', 'GET', null, res.status, res.data);
      toast('Fetched campaigns list', 'success');
    } catch (err: any) {
      logConsole('/api/campaigns', 'GET', null, err.response?.status || 'ERROR', err.response?.data || err.message);
      toast('Failed to fetch campaigns', 'error');
    }
  };

  const triggerSuggestCampaigns = async () => {
    if (!campaignSuggestionsSegmentId) {
      toast('Please select a segment ID first', 'info');
      return;
    }
    try {
      const payload = { segmentId: campaignSuggestionsSegmentId };
      const res = await api.post('/campaigns/suggest-campaigns', payload);
      logConsole('/api/campaigns/suggest-campaigns', 'POST', payload, res.status, res.data);
      toast('AI Campaign Suggestions loaded', 'success');
    } catch (err: any) {
      logConsole('/api/campaigns/suggest-campaigns', 'POST', { segmentId: campaignSuggestionsSegmentId }, err.response?.status || 'ERROR', err.response?.data || err.message);
      toast('Failed to fetch suggestions', 'error');
    }
  };

  const triggerGenerateCopy = async () => {
    try {
      const payload = {
        campaignName: copyCampaignName,
        segmentName: copySegmentName,
        channel: copyChannel,
        description: copyDescription
      };
      const res = await api.post('/campaigns/generate-copy', payload);
      logConsole('/api/campaigns/generate-copy', 'POST', payload, res.status, res.data);
      toast('AI Copywriting content generated', 'success');
    } catch (err: any) {
      logConsole('/api/campaigns/generate-copy', 'POST', null, err.response?.status || 'ERROR', err.response?.data || err.message);
      toast('AI copy generation failed', 'error');
    }
  };

  const triggerFetchAnalytics = async () => {
    try {
      const res = await api.get('/analytics');
      logConsole('/api/analytics', 'GET', null, res.status, res.data);
      toast('Successfully retrieved analytics aggregates', 'success');
    } catch (err: any) {
      logConsole('/api/analytics', 'GET', null, err.response?.status || 'ERROR', err.response?.data || err.message);
      toast('Failed to fetch analytics', 'error');
    }
  };

  const triggerSimulateWebhook = async () => {
    if (!webhookCommId) {
      toast('Select a campaign with communication logs first', 'info');
      return;
    }
    try {
      const payload = {
        communicationId: webhookCommId,
        status: webhookStatus
      };
      // Send directly to local webhook callback receiver
      const res = await api.post('/receipts', payload);
      logConsole('/api/receipts', 'POST', payload, res.status, res.data);
      toast(`Simulated receipt: ${webhookStatus}`, 'success');
      
      // Update our communications trace
      if (selectedCampaignId) {
        loadCampaignCommunications(selectedCampaignId);
      }
    } catch (err: any) {
      logConsole('/api/receipts', 'POST', { communicationId: webhookCommId, status: webhookStatus }, err.response?.status || 'ERROR', err.response?.data || err.message);
      toast('Webhook receipt callback simulation failed', 'error');
    }
  };

  return (
    <div className="space-y-6 select-none font-sans max-w-[1200px] mx-auto w-full">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Workspace Configuration</h2>
          <p className="text-xs text-slate-500 mt-1">Configure general profiles details, key credentials, and integration health</p>
        </div>
        {activeTab === 'general' && (
          <button
            onClick={fetchHealth}
            disabled={loadingHealth}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            {loadingHealth ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh Health
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation tabs */}
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-lg p-2.5 space-y-1 shadow-xs">
          <button 
            type="button"
            onClick={() => setActiveTab('general')}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'general' 
                ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600' 
                : 'text-slate-655 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            General & APIs
          </button>
          
          <button 
            type="button"
            onClick={() => {
              setActiveTab('diagnostics');
              loadDiagnosticsDropdowns();
            }}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'diagnostics' 
                ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600' 
                : 'text-slate-655 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Diagnostics & API Tester
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('access')}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'access' 
                ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600' 
                : 'text-slate-655 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            Access Controls
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit' 
                ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600' 
                : 'text-slate-655 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            Audit Logs
          </button>
        </div>

        {/* Tab content forms */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'general' && (
            <>
              <form onSubmit={handleSave}>
                <Card className="space-y-6 bg-white border border-slate-200 p-5 shadow-xs rounded-lg">
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                    <SettingsIcon className="h-4 w-4 text-blue-600" />
                    Workspace Details
                  </h3>

                  <div className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Workspace Name</label>
                      <input
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-808 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Owner Profile Name</label>
                        <div className="relative">
                          <input
                            type="text"
                            disabled
                            value={user?.name || ''}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-400 focus:outline-none text-xs cursor-not-allowed"
                          />
                          <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Owner Email Address</label>
                        <input
                          type="text"
                          disabled
                          value={user?.email || ''}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-400 focus:outline-none text-xs cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Developer API credentials */}
                  <div className="space-y-4 pt-5 border-t border-slate-100 text-xs">
                    <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <Key className="h-4 w-4 text-amber-500" />
                      Developer & AI API Keys
                    </h4>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-550 uppercase text-[9px] tracking-wider">OpenAI API Connection Key</label>
                      <input
                        type="password"
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-805 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs transition-all"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 leading-normal font-medium">
                        Used for natural language target segments recommendations. Falling back to local rules engine when key is omitted.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      {isSaved && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Settings saved successfully!
                        </span>
                      )}
                    </div>
                    
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-650 hover:bg-blue-755 text-white rounded text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      Save Configuration
                    </button>
                  </div>
                </Card>
              </form>

              {/* Database System health checks */}
              <Card className="space-y-4 bg-white border border-slate-200 p-5 shadow-xs rounded-lg">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  Service Health Integrations (Dynamic)
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold text-slate-700">PostgreSQL Relational DB</span>
                    </div>
                    {loadingHealth ? (
                      <span className="text-xs text-slate-450">Checking...</span>
                    ) : healthData?.db === 'CONNECTED' ? (
                      <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse">
                        CONNECTED
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                        DISCONNECTED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold text-slate-700">Channel Simulator webhook</span>
                    </div>
                    {loadingHealth ? (
                      <span className="text-xs text-slate-450">Checking...</span>
                    ) : healthData?.channelService === 'OPERATIONAL' ? (
                      <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        OPERATIONAL (PORT 5001)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100 animate-pulse">
                        OFFLINE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold text-slate-700">AI Recommendation Engine</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                      LOCAL HEURISTIC FALLBACK
                    </span>
                  </div>
                </div>
              </Card>
            </>
          )}

          {activeTab === 'diagnostics' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Form Controls - Left side */}
              <div className="lg:col-span-3 space-y-6 max-h-[80vh] overflow-y-auto pr-1 custom-scrollbar">
                
                {/* 1. System Health API */}
                <Card className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="h-4 w-4 text-blue-500" />
                      System Health & Ping Checks
                    </h4>
                    <button
                      type="button"
                      onClick={triggerHealthPing}
                      className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition"
                    >
                      <Play className="h-3 w-3" />
                      Ping
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    GET `/api/health` — Returns CRM status, PostgreSQL connectivity and Channel Simulator health.
                  </p>
                </Card>

                {/* 2. Customers API */}
                <Card className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 text-xs font-sans">
                  <h4 className="font-bold text-xs text-slate-805 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-emerald-500" />
                    Customers Database Router
                  </h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={triggerFetchCustomers}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition"
                    >
                      GET /api/customers
                    </button>
                  </div>
                  
                  <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                    <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400 block">POST /api/customers tester</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <input
                        type="text"
                        value={sampleCustomer.name}
                        onChange={(e) => setSampleCustomer(p => ({ ...p, name: e.target.value }))}
                        className="px-2 py-1 border rounded bg-slate-50 text-slate-800"
                        placeholder="Name"
                      />
                      <input
                        type="email"
                        value={sampleCustomer.email}
                        onChange={(e) => setSampleCustomer(p => ({ ...p, email: e.target.value }))}
                        className="px-2 py-1 border rounded bg-slate-50 text-slate-808"
                        placeholder="Email"
                      />
                      <input
                        type="text"
                        value={sampleCustomer.phone}
                        onChange={(e) => setSampleCustomer(p => ({ ...p, phone: e.target.value }))}
                        className="px-2 py-1 border rounded bg-slate-50 text-slate-808"
                        placeholder="Phone"
                      />
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={sampleCustomer.city}
                          onChange={(e) => setSampleCustomer(p => ({ ...p, city: e.target.value }))}
                          className="w-2/3 px-2 py-1 border rounded bg-slate-50 text-slate-808"
                          placeholder="City"
                        />
                        <input
                          type="number"
                          value={sampleCustomer.age}
                          onChange={(e) => setSampleCustomer(p => ({ ...p, age: e.target.value }))}
                          className="w-1/3 px-2 py-1 border rounded bg-slate-50 text-slate-808"
                          placeholder="Age"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={triggerCreateCustomer}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Test Customer (POST)
                    </button>
                  </div>
                </Card>

                {/* 3. Segments API */}
                <Card className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 text-xs">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Segments AI & Rules Router
                  </h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={triggerFetchSegments}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition"
                    >
                      GET /api/segments
                    </button>
                  </div>
                  
                  <div className="pt-2.5 border-t border-slate-100 space-y-2 text-[10px]">
                    <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400 block">POST /api/segments/parse</span>
                    <textarea
                      rows={2}
                      value={segmentPrompt}
                      onChange={(e) => setSegmentPrompt(e.target.value)}
                      className="w-full px-2 py-1 border rounded bg-slate-50 text-slate-800 font-sans"
                    />
                    <button
                      type="button"
                      onClick={triggerParseSegment}
                      className="w-full flex items-center justify-center gap-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition"
                    >
                      <Send className="h-3 w-3" />
                      Test Natural Language Rule Parser
                    </button>
                  </div>
                </Card>

                {/* 4. Campaigns & AI suggestions API */}
                <Card className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 text-xs">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Send className="h-4 w-4 text-amber-500" />
                    Campaigns & AI strategy
                  </h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={triggerFetchCampaigns}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                    >
                      GET /api/campaigns
                    </button>
                  </div>

                  {/* Suggest Strategy */}
                  <div className="pt-2.5 border-t border-slate-100 space-y-2">
                    <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400 block">POST /api/campaigns/suggest-campaigns</span>
                    <div className="flex gap-2">
                      <select
                        value={campaignSuggestionsSegmentId}
                        onChange={(e) => setCampaignSuggestionsSegmentId(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-slate-50 border rounded text-[10px] text-slate-800 focus:outline-none"
                      >
                        <option value="">Select Segment</option>
                        {segmentsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={triggerSuggestCampaigns}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold"
                      >
                        Get Ideas
                      </button>
                    </div>
                  </div>

                  {/* Write Copy */}
                  <div className="pt-2.5 border-t border-slate-100 space-y-2 text-[10px]">
                    <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400 block">POST /api/campaigns/generate-copy</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={copyCampaignName}
                        onChange={(e) => setCopyCampaignName(e.target.value)}
                        className="px-2 py-1 border rounded bg-slate-50 text-slate-800"
                        placeholder="Campaign Name"
                      />
                      <input
                        type="text"
                        value={copySegmentName}
                        onChange={(e) => setCopySegmentName(e.target.value)}
                        className="px-2 py-1 border rounded bg-slate-50 text-slate-808"
                        placeholder="Segment Name"
                      />
                      <select
                        value={copyChannel}
                        onChange={(e) => setCopyChannel(e.target.value)}
                        className="px-2 py-1 border rounded bg-slate-50 text-slate-808"
                      >
                        <option value="EMAIL">EMAIL</option>
                        <option value="SMS">SMS</option>
                        <option value="WHATSAPP">WHATSAPP</option>
                        <option value="RCS">RCS</option>
                      </select>
                      <input
                        type="text"
                        value={copyDescription}
                        onChange={(e) => setCopyDescription(e.target.value)}
                        className="px-2 py-1 border rounded bg-slate-50 text-slate-808"
                        placeholder="Description"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={triggerGenerateCopy}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold"
                    >
                      Generate Copy Strategy
                    </button>
                  </div>
                </Card>

                {/* 5. Webhook Receipts Simulator */}
                <Card className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 text-xs">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-indigo-500" />
                    Simulator Webhook Receipt Receiver
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    POST `/api/receipts` — Simulates receipt dispatch trace notifications and drives automatic shopper purchase conversions.
                  </p>

                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">1. Select Campaign</label>
                        <select
                          value={selectedCampaignId}
                          onChange={(e) => setSelectedCampaignId(e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border rounded text-slate-800 focus:outline-none"
                        >
                          <option value="">Choose Campaign</option>
                          {campaignsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">2. Select Log Target</label>
                        <select
                          value={webhookCommId}
                          onChange={(e) => setWebhookCommId(e.target.value)}
                          disabled={loadingComms || communicationsList.length === 0}
                          className="w-full px-2 py-1.5 bg-slate-50 border rounded text-slate-808 focus:outline-none disabled:opacity-50"
                        >
                          {loadingComms ? (
                            <option>Loading logs...</option>
                          ) : communicationsList.length === 0 ? (
                            <option>No deliveries logged</option>
                          ) : (
                            communicationsList.map(comm => (
                              <option key={comm.id} value={comm.id}>
                                {comm.customer?.name} ({comm.status})
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1 text-[10px]">
                        <label className="text-[9px] uppercase font-bold text-slate-400">3. Target status</label>
                        <select
                          value={webhookStatus}
                          onChange={(e) => setWebhookStatus(e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border rounded text-slate-808 focus:outline-none"
                        >
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="OPENED">OPENED</option>
                          <option value="CLICKED">CLICKED (Converts 35% chance)</option>
                          <option value="FAILED">FAILED</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={triggerSimulateWebhook}
                          disabled={!webhookCommId}
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded font-bold text-[10px] shadow-xs cursor-pointer"
                        >
                          Simulate Callback
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 6. Analytics API */}
                <Card className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="h-4 w-4 text-cyan-500" />
                      Analytics Summary API
                    </h4>
                    <button
                      type="button"
                      onClick={triggerFetchAnalytics}
                      className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition"
                    >
                      <Play className="h-3 w-3" />
                      Query
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-550">
                    GET `/api/analytics` — Fetches D2C revenue, conversion rates, and comparative statistics.
                  </p>
                </Card>

              </div>

              {/* JSON Live Console - Right side */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-900 text-slate-200 rounded-lg p-4 font-mono text-[10px] shadow-xl flex flex-col h-[75vh] border border-slate-950">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 shrink-0">
                    <span className="flex items-center gap-1.5 text-slate-400 font-bold">
                      <Terminal className="h-4.5 w-4.5 text-blue-400" />
                      API TERMINAL CONSOLE
                    </span>
                    {apiConsole.length > 0 && (
                      <button
                        onClick={() => setApiConsole([])}
                        className="text-[9px] text-rose-400 hover:text-rose-350 flex items-center gap-0.5 cursor-pointer font-sans"
                      >
                        <Trash2 className="h-3 w-3" />
                        Clear logs
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                    {apiConsole.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-500 text-center select-none font-sans px-4">
                        Console ready. Click any "Ping" or "POST/GET" action button to trace system responses.
                      </div>
                    ) : (
                      apiConsole.map((log, index) => (
                        <div key={index} className="space-y-1 border-b border-slate-800/60 pb-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] mr-1.5 font-bold ${
                                log.method === 'GET' ? 'bg-emerald-900 text-emerald-300' : 'bg-blue-900 text-blue-300'
                              }`}>
                                {log.method}
                              </span>
                              <span className="text-slate-100">{log.url}</span>
                            </span>
                            <span className="text-slate-500">{log.timestamp}</span>
                          </div>

                          {log.payload && (
                            <div className="text-slate-450 mt-1 pl-2 border-l border-slate-800">
                              <span className="text-[8px] text-slate-500 block font-bold uppercase">Payload:</span>
                              <pre className="overflow-x-auto select-all max-w-full">{JSON.stringify(log.payload)}</pre>
                            </div>
                          )}

                          <div className="mt-1 pl-2 border-l border-slate-800">
                            <span className="text-[8px] text-slate-500 block font-bold uppercase">
                              Response: <span className={
                                typeof log.status === 'number' && log.status < 300 
                                  ? 'text-emerald-400' 
                                  : 'text-rose-400'
                              }>{log.status}</span>
                            </span>
                            <pre className="overflow-x-auto bg-slate-950 p-2 rounded border border-slate-800/30 text-slate-300 whitespace-pre max-w-full scrollbar-none select-all select-text selection:bg-slate-800">
                              {JSON.stringify(log.response, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'access' && (
            <Card className="p-8 text-center border border-slate-200 rounded-lg bg-white shadow-xs">
              <Lock className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Access Controls Panel</h4>
              <p className="text-[10px] text-slate-450 mt-1 max-w-sm mx-auto leading-normal">
                Multi-tenant workspace user invites and role permission settings are restricted to primary owners.
              </p>
            </Card>
          )}

          {activeTab === 'audit' && (
            <Card className="p-8 text-center border border-slate-200 rounded-lg bg-white shadow-xs">
              <Database className="h-8 w-8 text-slate-305 mx-auto mb-3" />
              <h4 className="text-xs font-bold text-slate-805 uppercase tracking-wider">Audit Security Log</h4>
              <p className="text-[10px] text-slate-450 mt-1 max-w-sm mx-auto leading-normal">
                Chronological workspace configuration logs, API key rotations, and credentials modification reports.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
