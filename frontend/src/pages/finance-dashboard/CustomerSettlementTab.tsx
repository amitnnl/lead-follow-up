import { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { Search, Loader2, Edit, Save, X, Calculator, Clock, CheckCircle, Settings2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';

interface Settlement {
  lead_id: number;
  lead_code: string;
  customer_name: string;
  approved_loan_amount: number;
  loan_amount_received: number;
  
  insurance_charge: number;
  insurance_gst: number;
  
  rc_charge: number;
  
  rto_charge: number;
  rto_gst: number;
  
  other_charges: number;
  
  client_comm_type: 'Fixed' | 'Percentage';
  client_comm_value: number;
  client_comm_amount: number;
  
  total_deduction: number;
  net_payable: number;
  status: 'Pending' | 'Paid';
  payment_date: string | null;
  payment_mode: string | null;
  remarks: string | null;
}

export default function CustomerSettlementTab() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [editing, setEditing] = useState<Settlement | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settlement.php?action=list');
      if (res.data.settlements) {
        setSettlements(res.data.settlements);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setSaving(true);
      await api.post('/settlement.php?action=save', editing);
      setEditing(null);
      fetchSettlements();
    } catch (err) {
      console.error(err);
      alert('Failed to save settlement');
    } finally {
      setSaving(false);
    }
  };

  const handleDeductionChange = (field: keyof Settlement, val: string) => {
    if (!editing) return;
    
    // For select fields or strings, we assign directly, else parse float
    let finalVal: string | number = val;
    if (field !== 'client_comm_type' && field !== 'status' && field !== 'payment_mode' && field !== 'remarks' && field !== 'payment_date') {
      finalVal = parseFloat(val) || 0;
    }

    const update = { ...editing, [field]: finalVal };
    
    // Recalculate totals
    const insTotal = update.insurance_charge + (update.insurance_charge * (update.insurance_gst / 100));
    const rtoTotal = update.rto_charge + (update.rto_charge * (update.rto_gst / 100));
    
    let commAmt = 0;
    if (update.client_comm_type === 'Percentage') {
        commAmt = update.loan_amount_received * (update.client_comm_value / 100);
    } else {
        commAmt = update.client_comm_value;
    }
    update.client_comm_amount = commAmt;
    
    update.total_deduction = insTotal + update.rc_charge + rtoTotal + update.other_charges + commAmt;
    update.net_payable = update.loan_amount_received - update.total_deduction;
    
    setEditing(update as Settlement);
  };

  const filtered = settlements.filter(s => 
    s.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.lead_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-500" /> Settlement
          </h2>
          <p className="text-sm text-slate-500">Calculate and process final loan settlements for clients</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Client Name & Lead</th>
                <th className="px-6 py-4 font-semibold text-right">Gross Received</th>
                <th className="px-6 py-4 font-semibold text-right">Total Deductions</th>
                <th className="px-6 py-4 font-semibold text-right">Client Commission</th>
                <th className="px-6 py-4 font-semibold text-right">Net Payable</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading settlements...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No disbursed leads found.</td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.lead_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{s.customer_name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{s.lead_code}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      ₹{s.loan_amount_received.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-rose-600 dark:text-rose-400">
                      ₹{s.total_deduction.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-indigo-600 dark:text-indigo-400">
                      ₹{s.client_comm_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-primary-600 dark:text-primary-400">
                      ₹{s.net_payable.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        s.status === 'Paid' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                      }`}>
                        {s.status === 'Paid' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setEditing({ ...s, payment_date: s.payment_date || new Date().toISOString().split('T')[0] })}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
                        title="Edit Settlement"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal isOpen={true} onClose={() => setEditing(null)} zClassName="z-[9999]" className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[95vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Calculator className="w-4.5 h-4.5 text-primary-500" /> Client Settlement: {editing.customer_name}
              </h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Gross Loan Amount Received</div>
                  <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    ₹{editing.loan_amount_received.toLocaleString()}
                  </div>
                </div>
                <div className="bg-primary-50 dark:bg-primary-500/10 p-4 rounded-xl border border-primary-100 dark:border-primary-500/20">
                  <div className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase">Net Amount Payable</div>
                  <div className="text-2xl font-mono font-bold text-primary-700 dark:text-primary-300 mt-1">
                    ₹{editing.net_payable.toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">Itemized Deductions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Insurance */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Insurance Amount</label>
                        <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                            ₹{(editing.insurance_charge + (editing.insurance_charge * editing.insurance_gst / 100)).toLocaleString()}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-[10px] text-slate-500 block mb-1">Base Amount (₹)</span>
                            <input type="number" min="0" step="0.01" disabled={editing.status === 'Paid'} required value={editing.insurance_charge} onChange={(e) => handleDeductionChange('insurance_charge', e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 block mb-1">Applicable GST (%)</span>
                            <input type="number" min="0" step="0.01" disabled={editing.status === 'Paid'} required value={editing.insurance_gst} onChange={(e) => handleDeductionChange('insurance_gst', e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                        </div>
                    </div>
                  </div>

                  {/* RTO */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">RTO Amount</label>
                        <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                            ₹{(editing.rto_charge + (editing.rto_charge * editing.rto_gst / 100)).toLocaleString()}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-[10px] text-slate-500 block mb-1">Base Amount (₹)</span>
                            <input type="number" min="0" step="0.01" disabled={editing.status === 'Paid'} required value={editing.rto_charge} onChange={(e) => handleDeductionChange('rto_charge', e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 block mb-1">Applicable GST (%)</span>
                            <input type="number" min="0" step="0.01" disabled={editing.status === 'Paid'} required value={editing.rto_gst} onChange={(e) => handleDeductionChange('rto_gst', e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                        </div>
                    </div>
                  </div>

                  {/* Vehicle RC & Others */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Vehicle RC & Other</label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-[10px] text-slate-500 block mb-1">RC Amount (₹)</span>
                            <input type="number" min="0" step="0.01" disabled={editing.status === 'Paid'} required value={editing.rc_charge} onChange={(e) => handleDeductionChange('rc_charge', e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 block mb-1">Other Charges (₹)</span>
                            <input type="number" min="0" step="0.01" disabled={editing.status === 'Paid'} required value={editing.other_charges} onChange={(e) => handleDeductionChange('other_charges', e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                        </div>
                    </div>
                  </div>

                  {/* Client Commission */}
                  <div className="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800/50">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Client Commission (Retained)</label>
                        <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400">
                            ₹{editing.client_comm_amount.toLocaleString()}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-[10px] text-indigo-600 block mb-1">Type</span>
                            <select disabled={editing.status === 'Paid'} value={editing.client_comm_type} onChange={(e) => handleDeductionChange('client_comm_type', e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded text-sm">
                                <option value="Percentage">Percentage (%)</option>
                                <option value="Fixed">Fixed Amount (₹)</option>
                            </select>
                        </div>
                        <div>
                            <span className="text-[10px] text-indigo-600 block mb-1">Value</span>
                            <input type="number" min="0" step="0.01" disabled={editing.status === 'Paid'} required value={editing.client_comm_value} onChange={(e) => handleDeductionChange('client_comm_value', e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded text-sm" />
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">Final Payment Status</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                    <select value={editing.status} disabled={editing.status === 'Paid' && false} onChange={(e) => setEditing({...editing, status: e.target.value as any})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                  {editing.status === 'Paid' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Payment Date</label>
                        <input type="date" required value={editing.payment_date || ''} onChange={(e) => setEditing({...editing, payment_date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Remarks / Reference</label>
                        <input type="text" value={editing.remarks || ''} onChange={(e) => setEditing({...editing, remarks: e.target.value})} placeholder="UTR or notes..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-lg shadow-primary-500/30">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Client Settlement
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
