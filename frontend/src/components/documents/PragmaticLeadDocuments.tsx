import React, { useState } from 'react';
import { 
  FileText, CheckCircle, XCircle, Trash2, Eye, Plus, 
  UploadCloud, AlertCircle, ShieldCheck, X
} from 'lucide-react';

interface DocumentItem {
  id: number;
  lead_id: number;
  category?: string;
  document_type: string;
  file_path: string;
  expiry_date?: string;
  file_size?: number;
  verification_status: string;
  verification_notes?: string;
  created_at?: string;
}

interface EasyLeadDocumentsProps {
  lead: any;
  documents: DocumentItem[];
  onUpload: (category: string, docType: string, file: File, expiryDate?: string) => Promise<void>;
  onVerify: (id: number, status: 'verified' | 'rejected') => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onOpenAssignmentModal: () => void;
  canVerifyDocs: boolean;
  isAdminOrManager: boolean;
  uploadingDoc: boolean;
  getDocUrl: (path: string) => string;
}

export default function PragmaticLeadDocuments({
  lead,
  documents = [],
  onUpload,
  onVerify,
  onDelete,
  canVerifyDocs,
  isAdminOrManager,
  uploadingDoc,
  getDocUrl
}: EasyLeadDocumentsProps) {
  const isDisbursed = lead?.status === 'disbursed';
  // Simple state for single upload area
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [docType, setDocType] = useState('aadhaar');
  const [file, setFile] = useState<File | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  // Auto-infer category from docType so user doesn't have to think about it
  const getCategoryFromType = (type: string) => {
    if (['aadhaar', 'pan', 'bank_statement', 'photo'].includes(type)) return 'kyc';
    if (['rc', 'insurance', 'driving_license'].includes(type)) return 'vehicle';
    if (['sanction_letter', 'loan_agreement', 'mandate_form'].includes(type)) return 'sanction';
    return 'dealer';
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const category = getCategoryFromType(docType);
    await onUpload(category, docType, file);
    setFile(null);
    setShowUploadForm(false);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getDocTitle = (type: string) => {
    const map: Record<string, string> = {
      aadhaar: 'Aadhaar Card',
      pan: 'PAN Card',
      bank_statement: '6-Month Bank Statement',
      photo: 'Applicant Photograph',
      rc: 'RC Certificate',
      insurance: 'Insurance Policy',
      driving_license: 'Driving License',
      sanction_letter: 'Bank Sanction Letter',
      loan_agreement: 'Loan Agreement',
      mandate_form: 'NACH / E-Mandate Form',
      dealer_proforma: 'Dealer Proforma Invoice',
      advance_receipt: 'Advance / Margin Receipt',
      other: 'Supporting Document'
    };
    return map[type] || type.replace(/_/g, ' ');
  };

  // Filter only active (non-archived) documents
  const activeDocs = documents.filter(d => d.verification_notes !== 'Archived / Removed by user');

  // Apply category tab filter
  const filteredDocs = activeFilter === 'all' 
    ? activeDocs 
    : activeDocs.filter(d => {
        const cat = d.category || getCategoryFromType(d.document_type);
        return cat === activeFilter;
      });

  // Check if mandatory files (PAN, Aadhaar, RC) are verified
  const hasPan = activeDocs.some(d => d.document_type === 'pan' && d.verification_status === 'verified');
  const hasAadhaar = activeDocs.some(d => d.document_type === 'aadhaar' && d.verification_status === 'verified');
  const hasRc = activeDocs.some(d => d.document_type === 'rc' && d.verification_status === 'verified');
  const isReadyForDisbursal = hasPan && hasAadhaar && hasRc;

  return (
    <div className="space-y-6">
      
      {/* 1. SIMPLE TOP UPLOAD BAR & REQUIRED DOCS STATUS */}
      <div className="card p-5 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#111827]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" /> Lead Documents Vault
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Easily upload, preview, and verify all files for this customer.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {showUploadForm ? 'Close Upload Form' : 'Upload New Document'}
          </button>
        </div>

        {isDisbursed && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-450 rounded-xl text-[11px] font-semibold flex items-center gap-2 animate-fade-in">
            <ShieldCheck className="w-4 h-4 text-emerald-650 dark:text-emerald-400 shrink-0" />
            Note: This lead is disbursed. You can still upload additional documents (like RC or Insurance) as required.
          </div>
        )}

        {/* Missing Documents Quick Upload Checklist */}
        {(() => {
          const requiredDocs = [
            { type: 'aadhaar', label: 'Aadhaar Card', cat: 'kyc' },
            { type: 'pan', label: 'PAN Card', cat: 'kyc' },
            { type: 'bank_statement', label: 'Bank Statement', cat: 'kyc' },
            { type: 'photo', label: 'Applicant Photo', cat: 'kyc' },
            { type: 'rc', label: 'RC Certificate', cat: 'vehicle' },
            { type: 'insurance', label: 'Insurance Policy', cat: 'vehicle' }
          ];
          const missingDocs = requiredDocs.filter(item => !documents.some(d => d.document_type === item.type && d.verification_notes !== 'Archived / Removed by user'));
          
          if (missingDocs.length === 0) return null;

          return (
            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Missing Documents Checklist
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {missingDocs.map(item => (
                  <div key={item.type} className="p-3 bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-500/20 rounded-xl flex items-center justify-between gap-2 shadow-sm transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-500/40 group">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300 truncate pr-2">{item.label}</span>
                    <label className="text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/50 px-2.5 py-1.5 rounded-lg text-amber-700 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 cursor-pointer transition-colors shadow-sm flex items-center gap-1 shrink-0">
                      {uploadingDoc ? '...' : <><UploadCloud className="w-3.5 h-3.5" /> Upload</>}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            onUpload(item.cat, item.type, e.target.files[0]);
                          }
                        }}
                        disabled={uploadingDoc}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Easiest Inline Upload Form */}
        {showUploadForm && (
          <form onSubmit={handleUploadSubmit} className="mt-5 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-primary-200 dark:border-primary-800/60 animate-in fade-in slide-in-from-top-2 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-primary-500" /> Select Document & File
              </span>
              <button type="button" onClick={() => setShowUploadForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Document Name / Type</label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <optgroup label="Customer KYC (Personal)">
                    <option value="aadhaar">Aadhaar Card</option>
                    <option value="pan">PAN Card</option>
                    <option value="bank_statement">6-Month Bank Statement</option>
                    <option value="photo">Applicant Photograph</option>
                  </optgroup>
                  <optgroup label="Vehicle Records">
                    <option value="rc">RC (Registration Certificate)</option>
                    <option value="insurance">Insurance Policy</option>
                    <option value="driving_license">Driving License</option>
                  </optgroup>
                  <optgroup label="Bank & Loan Documents">
                    <option value="sanction_letter">Bank Sanction Letter</option>
                    <option value="loan_agreement">Signed Loan Agreement</option>
                    <option value="mandate_form">NACH / E-Mandate Form</option>
                  </optgroup>
                  <optgroup label="Dealer Documents">
                    <option value="dealer_proforma">Dealer Proforma Invoice</option>
                    <option value="advance_receipt">Advance Receipt</option>
                    <option value="other">Other Document</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Choose File (PDF, JPG, PNG)</label>
                <input
                  type="file"
                  required
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="w-full text-xs text-slate-500 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 p-1 rounded-xl file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700 dark:file:bg-primary-950 dark:file:text-primary-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingDoc || !file}
                className="px-5 py-2 text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
              >
                {uploadingDoc ? 'Uploading...' : 'Save Document'}
              </button>
            </div>
          </form>
        )}

        {/* Clean, Simple Status Pill */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {isReadyForDisbursal ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-lg">
                <ShieldCheck className="w-4 h-4" /> All required KYC & RC verified for disbursal
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>
                  Required for Disbursal: 
                  <strong className={hasPan ? 'text-emerald-600 ml-1' : 'text-amber-600 ml-1'}>PAN {hasPan ? '✓' : '✗'}</strong>, 
                  <strong className={hasAadhaar ? 'text-emerald-600 ml-1' : 'text-amber-600 ml-1'}>Aadhaar {hasAadhaar ? '✓' : '✗'}</strong>, 
                  <strong className={hasRc ? 'text-emerald-600 ml-1' : 'text-amber-600 ml-1'}>RC {hasRc ? '✓' : '✗'}</strong>
                </span>
              </span>
            )}
          </div>

          <div className="text-slate-400 font-medium">
            Total Files Uploaded: <strong className="text-slate-700 dark:text-slate-300">{activeDocs.length}</strong>
          </div>
        </div>
      </div>

      {/* 2. SIMPLE CATEGORY FILTER TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Documents', count: activeDocs.length },
          { id: 'kyc', label: '👤 KYC', count: activeDocs.filter(d => (d.category || getCategoryFromType(d.document_type)) === 'kyc').length },
          { id: 'vehicle', label: '🚗 Vehicle Records', count: activeDocs.filter(d => (d.category || getCategoryFromType(d.document_type)) === 'vehicle').length },
          { id: 'sanction', label: '🏛️ Bank Sanctions', count: activeDocs.filter(d => (d.category || getCategoryFromType(d.document_type)) === 'sanction').length },
          { id: 'dealer', label: '🏢 Dealer Invoices', count: activeDocs.filter(d => (d.category || getCategoryFromType(d.document_type)) === 'dealer').length },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeFilter === tab.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeFilter === tab.id ? 'bg-primary-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 3. CLEAN & SPACIOUS DOCUMENT GRID */}
      {filteredDocs.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-[#111827]/50">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No documents found in this section</h4>
          <p className="text-xs text-slate-500 mt-1">Click "Upload New Document" above to attach files easily.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map(doc => {
            const isVerified = doc.verification_status === 'verified';
            const isRejected = doc.verification_status === 'rejected';

            return (
              <div
                key={doc.id}
                className="card p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4 bg-white dark:bg-[#111827] hover:border-primary-400/60 dark:hover:border-primary-500/40 transition-all shadow-sm group"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className={`p-3 rounded-xl shrink-0 ${
                    isVerified ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                    isRejected ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                      {getDocTitle(doc.document_type)}
                    </p>

                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                      {doc.file_size && doc.file_size > 0 && <span>{formatSize(doc.file_size)}</span>}
                      
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                        isVerified ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' :
                        isRejected ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                      }`}>
                        {isVerified && <CheckCircle className="w-3 h-3" />}
                        {isRejected && <XCircle className="w-3 h-3" />}
                        {doc.verification_status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({ url: getDocUrl(doc.file_path), title: getDocTitle(doc.document_type) })}
                    className="p-2 text-xs font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Preview Document"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Preview</span>
                  </button>

                  {canVerifyDocs && doc.verification_status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onVerify(doc.id, 'verified')}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 cursor-pointer"
                        title="Verify Document"
                      >
                        ✓ Verify
                      </button>
                      <button
                        type="button"
                        onClick={() => onVerify(doc.id, 'rejected')}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl text-xs font-bold transition-all border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 cursor-pointer"
                        title="Reject Document"
                      >
                        ✕
                      </button>
                    </>
                  )}

                  {isAdminOrManager && (
                    <button
                      type="button"
                      onClick={() => onDelete(doc.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                      title="Delete Document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal Overlay */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-400" /> {previewDoc.title}
              </h3>
              <button onClick={() => setPreviewDoc(null)} className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-950 relative overflow-auto flex items-center justify-center p-2">
              {previewDoc.url.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewDoc.url} title={previewDoc.title} className="w-full h-full rounded-lg border-0" />
              ) : (
                <img src={previewDoc.url} alt={previewDoc.title} className="max-h-full max-w-full object-contain rounded-lg shadow-lg" />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
