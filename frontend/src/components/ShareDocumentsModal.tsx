import React, { useState } from 'react';
import { X, Send, Mail, MessageCircle, FileText, CheckCircle2 } from 'lucide-react';
import api from '../lib/axios';

interface ShareDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  documents: any[];
  financerEmail?: string;
  financerMobile?: string;
  executiveEmail?: string;
  executiveMobile?: string;
}

export default function ShareDocumentsModal({
  isOpen, onClose, leadId, documents,
  financerEmail, financerMobile, executiveEmail, executiveMobile
}: ShareDocumentsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [whatsappFlow, setWhatsappFlow] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState('');
  const [whatsappText, setWhatsappText] = useState('');

  const [channel, setChannel] = useState<'email' | 'whatsapp'>('whatsapp');
  const [recipientType, setRecipientType] = useState<'financer' | 'executive' | 'custom'>('financer');
  const [customRecipient, setCustomRecipient] = useState('');
  const [message, setMessage] = useState('');
  
  // Default to selecting all documents
  const [selectedDocs, setSelectedDocs] = useState<number[]>(documents.map(d => d.id));

  if (!isOpen) return null;

  const handleToggleDoc = (id: number) => {
    setSelectedDocs(prev => prev.includes(id) ? prev.filter(dId => dId !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDocs.length === 0) {
      setError('Please select at least one document.');
      return;
    }

    let recipient = customRecipient;
    if (recipientType === 'financer') {
      recipient = channel === 'email' ? (financerEmail || '') : (financerMobile || '');
    } else if (recipientType === 'executive') {
      recipient = channel === 'email' ? (executiveEmail || '') : (executiveMobile || '');
    }

    if (!recipient) {
      setError(`No ${channel === 'email' ? 'email' : 'phone number'} available for the selected recipient.`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/share_documents', {
        lead_id: leadId,
        document_ids: selectedDocs,
        channel,
        recipient,
        message
      });

      if (channel === 'email') {
        setSuccess('Documents shared successfully via Email.');
        setTimeout(onClose, 2000);
      } else {
        // WhatsApp
        const url = res.data.url;
        const text = encodeURIComponent(`${message ? message + '\n\n' : ''}Here are the documents for Lead #${leadId}:\n${url}`);
        
        setGeneratedPdfUrl(url);
        setWhatsappText(`https://wa.me/${recipient.replace(/\D/g, '')}?text=${text}`);
        setWhatsappFlow(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to share documents.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
              <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Share Documents</h2>
              <p className="text-[11px] text-slate-500">Wrap as PDF and send</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar">
          {whatsappFlow ? (
            <div className="flex flex-col items-center justify-center text-center py-6 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">PDF Generated!</h3>
              <p className="text-xs text-slate-500 mb-6 max-w-sm">WhatsApp Web does not allow automatic file attachments. Follow these two simple steps:</p>
              
              <div className="w-full space-y-3 px-4">
                <a 
                  href={generatedPdfUrl} 
                  download={`Lead_${leadId}_Documents.pdf`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 font-bold rounded-xl border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                >
                  <FileText className="w-4 h-4" /> 1. Download PDF to Computer
                </a>
                
                <button 
                  onClick={() => { window.open(whatsappText, '_blank'); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/20 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" /> 2. Open WhatsApp & Send
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-5 italic">Once WhatsApp opens, just drag & drop the downloaded PDF into the chat window.</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <p>{success}</p>
                </div>
              )}

              <form id="shareForm" onSubmit={handleSubmit} className="space-y-5">
            {/* Channel Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Delivery Channel</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setChannel('whatsapp')} className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-colors ${channel === 'whatsapp' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}>
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
                <button type="button" onClick={() => setChannel('email')} className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-colors ${channel === 'email' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}>
                  <Mail className="w-4 h-4" /> Email
                </button>
              </div>
            </div>

            {/* Recipient Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Recipient</label>
              <select value={recipientType} onChange={(e: any) => setRecipientType(e.target.value)} className="w-full h-[42px] px-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500 mb-3">
                <option value="financer">Financer</option>
                <option value="executive">Field Executive</option>
                <option value="custom">Custom {channel === 'whatsapp' ? 'Phone Number' : 'Email Address'}</option>
              </select>

              {recipientType === 'custom' && (
                <input
                  type={channel === 'email' ? 'email' : 'text'}
                  required
                  placeholder={channel === 'email' ? 'Enter email address' : 'Enter mobile number with country code'}
                  value={customRecipient}
                  onChange={(e) => setCustomRecipient(e.target.value)}
                  className="w-full h-[42px] px-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500"
                />
              )}
            </div>

            {/* Message */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Message (Optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a custom message..."
                className="w-full h-20 p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500 resize-none"
              ></textarea>
            </div>

            {/* Documents Selection */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Documents</label>
                <span className="text-xs text-indigo-600 font-semibold">{selectedDocs.length} selected</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {documents.map((doc) => (
                  <label key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => handleToggleDoc(doc.id)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{doc.original_name || doc.file_path}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{doc.doc_type_code}</p>
                    </div>
                  </label>
                ))}
                {documents.length === 0 && (
                  <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-xs">
                    No documents uploaded yet.
                  </div>
                )}
              </div>
            </div>
          </form>
            </>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
          {whatsappFlow ? (
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
              Close
            </button>
          ) : (
            <>
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                Cancel
              </button>
              <button form="shareForm" type="submit" disabled={loading || selectedDocs.length === 0} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-indigo-600/20">
                {loading ? 'Processing...' : (channel === 'email' ? 'Send Email' : 'Open WhatsApp')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
