import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Plus, 
  Upload, 
  Search, 
  Loader2, 
  AlertCircle, 
  SlidersHorizontal,
  MapPin,
  Clock,
  X,
  Phone,
  Mail,
  User,
  ShoppingBag as OrderIcon,
  Tag
} from 'lucide-react';
import { Card } from '../components/Card';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../components/Table';

interface Order {
  id: string;
  amount: number;
  orderDate: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  age: number;
  totalSpend: number;
  lastOrderDate: string | null;
  orders?: Order[];
}

const Customers: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Search & Filter States
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [minSpendFilter, setMinSpendFilter] = useState('');
  const [inactiveDaysFilter, setInactiveDaysFilter] = useState('');
  const [ageRange, setAgeRange] = useState({ min: '', max: '' });
  const [showFilters, setShowFilters] = useState(false);

  // Modal / Drawer States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form inputs
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', city: '', age: '' });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Customers
  const { data: customers, isLoading, error } = useQuery<Customer[]>({
    queryKey: ['customers', search, cityFilter, minSpendFilter, inactiveDaysFilter, ageRange],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      if (cityFilter) params.city = cityFilter;
      if (minSpendFilter) params.minSpend = minSpendFilter;
      if (inactiveDaysFilter) params.inactiveDays = inactiveDaysFilter;
      if (ageRange.min) params.minAge = ageRange.min;
      if (ageRange.max) params.maxAge = ageRange.max;

      const res = await api.get('/customers', { params });
      return res.data;
    }
  });

  // Unique cities list
  const { data: allCustomers } = useQuery<Customer[]>({
    queryKey: ['all-customers-list'],
    queryFn: async () => {
      const res = await api.get('/customers');
      return res.data;
    }
  });
  const cities = Array.from(new Set(allCustomers?.map(c => c.city) || []));

  // Add customer mutation
  const addMutation = useMutation({
    mutationFn: async (data: typeof newCustomer) => {
      return api.post('/customers', {
        ...data,
        age: parseInt(data.age, 10)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['all-customers-list'] });
      setShowAddModal(false);
      setNewCustomer({ name: '', email: '', phone: '', city: '', age: '' });
      setFormError(null);
      toast('Customer profile added successfully', 'success');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Failed to create customer profile.';
      setFormError(msg);
      toast(msg, 'error');
    }
  });

  // Import CSV mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/customers/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['all-customers-list'] });
      setImportStatus(res.data.message);
      setCsvFile(null);
      toast('CSV shoppers roster imported', 'success');
      setShowImportModal(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'CSV import failed. Check structure.';
      setFormError(msg);
      toast(msg, 'error');
    }
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newCustomer.name || !newCustomer.email || !newCustomer.phone || !newCustomer.city || !newCustomer.age) {
      setFormError('All fields are required.');
      return;
    }
    addMutation.mutate(newCustomer);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setImportStatus(null);
    if (!csvFile) {
      setFormError('Please select a file.');
      return;
    }
    importMutation.mutate(csvFile);
  };

  const clearFilters = () => {
    setSearch('');
    setCityFilter('');
    setMinSpendFilter('');
    setInactiveDaysFilter('');
    setAgeRange({ min: '', max: '' });
    toast('Filters reset', 'info');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getCustomerStatus = (c: Customer) => {
    if (!c.lastOrderDate) return { label: 'No Orders', style: 'bg-slate-100 text-slate-700 border-slate-200' };
    const days = (new Date().getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 60) return { label: 'Active', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return { label: 'Inactive', style: 'bg-amber-50 text-amber-705 border-amber-200' };
  };

  const getShopperRecommendations = (c: Customer) => {
    const isHighSpender = c.totalSpend > 2000;
    const isInactive = c.lastOrderDate 
      ? (new Date().getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24) > 60
      : true;

    if (isHighSpender) {
      return { coupon: 'VIPGIFT', description: 'Send exclusive free gift voucher code VIPGIFT.' };
    }
    if (isInactive) {
      return { coupon: 'WINBACK20', description: 'Target with win-back 20% discount code WINBACK20.' };
    }
    return { coupon: 'FREESHIP', description: 'Recommend free shipping code FREESHIP to incentivize purchase.' };
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto w-full">
      {/* Header Row */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">D2C Customer Directory</h2>
          <p className="text-xs text-slate-500 mt-1 font-sans">Manage, filter, and view specific shoppers and purchase histories.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowImportModal(true); setFormError(null); setImportStatus(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 shadow-xs transition"
          >
            <Upload className="h-3.5 w-3.5 text-slate-500" />
            Import CSV
          </button>
          
          <button
            onClick={() => { setShowAddModal(true); setFormError(null); }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-xs transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* CRM Search & Filters bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 select-none">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 h-full w-4" />
          <input
            type="text"
            placeholder="Search customers by name, email, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs font-bold transition shadow-xs ${
              showFilters 
                ? 'bg-slate-100 border-slate-300 text-slate-900' 
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </button>
          
          {(search || cityFilter || minSpendFilter || inactiveDaysFilter || ageRange.min || ageRange.max) && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Expandable detailed filters */}
      {showFilters && (
        <Card className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-5 border-slate-200 shadow-xs select-none bg-white rounded-lg">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Living City</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Age boundaries</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={ageRange.min}
                onChange={(e) => setAgeRange(p => ({ ...p, min: e.target.value }))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs focus:outline-none"
              />
              <span className="text-slate-300">-</span>
              <input
                type="number"
                placeholder="Max"
                value={ageRange.max}
                onChange={(e) => setAgeRange(p => ({ ...p, max: e.target.value }))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Min total spend ($)</label>
            <input
              type="number"
              placeholder="e.g. 1000"
              value={minSpendFilter}
              onChange={(e) => setMinSpendFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Inactivity (Days)</label>
            <input
              type="number"
              placeholder="e.g. 60"
              value={inactiveDaysFilter}
              onChange={(e) => setInactiveDaysFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs focus:outline-none"
            />
          </div>
        </Card>
      )}

      {/* Table grid layout */}
      <Card className="p-0 overflow-hidden border border-slate-200 shadow-xs bg-white rounded-lg">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : error || !customers ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Failed to retrieve customer profiles list records.
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            No customers match the active filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Name</TableCell>
                <TableCell isHeader>Email</TableCell>
                <TableCell isHeader>City</TableCell>
                <TableCell isHeader className="text-center font-bold">Orders</TableCell>
                <TableCell isHeader className="text-right">Revenue</TableCell>
                <TableCell isHeader className="text-center">Status</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => {
                const status = getCustomerStatus(c);
                return (
                  <TableRow key={c.id} onClick={() => setSelectedCustomer(c)}>
                    <TableCell className="font-bold text-slate-900">{c.name}</TableCell>
                    <TableCell className="text-slate-550">{c.email}</TableCell>
                    <TableCell className="text-slate-600">{c.city}</TableCell>
                    <TableCell className="text-center text-slate-600 font-mono font-medium">{c.orders?.length || 0}</TableCell>
                    <TableCell className="text-right text-slate-900 font-mono font-semibold">{formatCurrency(c.totalSpend)}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${status.style}`}>
                        {status.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Slide-in details Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn select-none">
          <div onClick={() => setSelectedCustomer(null)} className="fixed inset-0 bg-slate-900/10 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between z-10">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 font-bold text-sm flex items-center justify-center shrink-0">
                    {selectedCustomer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-805">{selectedCustomer.name}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {selectedCustomer.city}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1 rounded-md hover:bg-slate-50 text-slate-400 border border-slate-150"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* CRM Incentive Advice */}
              {(() => {
                const recommendation = getShopperRecommendations(selectedCustomer);
                return (
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 space-y-2 text-xs">
                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-blue-500" />
                      Targeting Recommendation
                    </span>
                    <p className="text-slate-655 leading-relaxed font-semibold">
                      {recommendation.description}
                    </p>
                    <span className="inline-block px-2.5 py-0.5 bg-white border border-blue-200 rounded text-[9px] font-mono font-bold text-blue-600 mt-1">
                      Promo Code: {recommendation.coupon}
                    </span>
                  </div>
                );
              })()}

              {/* Demographics info */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">shopper info</h4>
                <div className="grid grid-cols-1 gap-2 text-xs text-slate-650">
                  <div className="flex items-center gap-3 py-1.5 border-b border-slate-50">
                    <Mail className="h-4.5 w-4.5 text-slate-400" />
                    <span>{selectedCustomer.email}</span>
                  </div>
                  <div className="flex items-center gap-3 py-1.5 border-b border-slate-50">
                    <Phone className="h-4.5 w-4.5 text-slate-400" />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 py-1.5 border-b border-slate-50">
                    <User className="h-4.5 w-4.5 text-slate-400" />
                    <span>{selectedCustomer.age} years old</span>
                  </div>
                </div>
              </div>

              {/* Timelines */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Purchase History</h4>
                {!selectedCustomer.orders || selectedCustomer.orders.length === 0 ? (
                  <p className="text-xs text-slate-450 italic">No orders history registered.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white overflow-hidden text-xs">
                    {selectedCustomer.orders.map((o) => (
                      <div key={o.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <OrderIcon className="h-4 w-4 text-slate-400" />
                          <span className="font-semibold text-slate-700">Order #{o.id.slice(0, 4)}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900 font-mono">{formatCurrency(o.amount)}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{new Date(o.orderDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded shadow-xs transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add shopper Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn select-none">
          <div onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-slate-900/15" />
          <Card className="relative w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 shadow-2xl z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Add Customer Profile</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-slate-50 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-md flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Customer Name</label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-705 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="name@company.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-705 focus:outline-none"
                    placeholder="555-0199"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Living City</label>
                  <input
                    type="text"
                    required
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer(p => ({ ...p, city: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-705 focus:outline-none"
                    placeholder="e.g. Los Angeles"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Age</label>
                  <input
                    type="number"
                    required
                    value={newCustomer.age}
                    onChange={(e) => setNewCustomer(p => ({ ...p, age: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-705 focus:outline-none"
                    placeholder="25"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-55 text-slate-650 rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs transition"
                >
                  {addMutation.isPending ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn select-none">
          <div onClick={() => setShowImportModal(false)} className="fixed inset-0 bg-slate-900/15" />
          <Card className="relative w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 shadow-2xl z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Import CSV shoppers</h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 rounded hover:bg-slate-50 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {importStatus && (
              <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs rounded-md flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{importStatus}</span>
              </div>
            )}

            <form onSubmit={handleImportSubmit} className="space-y-4 text-xs">
              <div className="border border-slate-200 rounded-lg p-6 text-center space-y-2 bg-slate-50 hover:bg-slate-100/30 transition">
                <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-slate-700 font-bold">Select CSV list file</p>
                
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 mt-2 mx-auto
                    file:mr-4 file:py-1 file:px-2.5
                    file:rounded file:border-0
                    file:text-[10px] file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded font-semibold"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={importMutation.isPending || !csvFile}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs transition"
                >
                  {importMutation.isPending ? 'Importing...' : 'Import'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Customers;
