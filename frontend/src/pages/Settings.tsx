import React, { useState, useEffect } from 'react';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { 
  User, Settings as SettingsIcon, DollarSign, 
  Workflow, Mail, CheckCircle, Shield, Sparkles, Share2,
  Layers, Bell
} from 'lucide-react';
import clsx from 'clsx';

const tabs = [
  { id: 'profile', label: 'My Profile', icon: User, group: 'Personal', restricted: false },
  { id: 'system', label: 'System & Identity', icon: SettingsIcon, group: 'Global Project', restricted: true, badge: 'Brand' },
  { id: 'security', label: 'Security & Rate Limits', icon: Shield, group: 'Global Project', restricted: true, badge: 'Auth' },
  { id: 'slideshow', label: 'Hero Slideshow', icon: Sparkles, group: 'Global Project', restricted: true, badge: 'Landing' },
  { id: 'socials', label: 'Socials & Contact Hub', icon: Share2, group: 'Global Project', restricted: true, badge: 'Links' },
  { id: 'financial', label: 'Financial Defaults', icon: DollarSign, group: 'Global Project', restricted: true, badge: 'Rates' },
  { id: 'workflow', label: 'Lead Workflow', icon: Workflow, group: 'Global Project', restricted: true, badge: 'Rules' },
  { id: 'smtp', label: 'SMTP Server', icon: Mail, group: 'Global Project', restricted: true, badge: 'Email' },
];

export default function Settings() {
  const { user, setUser } = useAuthStore();
  const { fetchSettings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';
  const isRestrictedIdentity = user?.role !== 'admin' && user?.role !== 'manager';

  // Form States
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', current_password: '', new_password: '', confirm_password: '' });
  const [systemForm, setSystemForm] = useState({ 
    app_name: 'LeadFlow Pro', company_name: 'LeadFlow Pro', support_email: 'support@leadflowpro.com', 
    contact_number: '+91 98765 43210', office_address: '102, Business Arcade, Main Road, New Delhi, India',
    whatsapp_number: '+91 98765 43210', default_currency: 'INR', system_timezone: 'Asia/Kolkata', 
    session_timeout: '120', maintenance_mode: false 
  });
  const [financialForm, setFinancialForm] = useState({ default_tds_rate: '5', default_processing_fee: '0' });
  const [workflowForm, setWorkflowForm] = useState({ default_lead_status: 'New', followup_sla_days: '3' });
  const [smtpForm, setSMTPForm] = useState({ smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '' });
  const [slideshowForm, setSlideshowForm] = useState({
    slide1_title: 'Passenger Cars Finance', slide1_description: 'Low-interest rates starting at 9.5% p.a. for hatchbacks, sedans, and luxury SUVs with flexible tenures up to 7 years.', slide1_badge: 'Passenger Vehicle',
    slide2_title: 'Commercial & Cargo Trucks', slide2_description: 'Empower your transport business. Funding up to 90% LTV on loaders, commercial trailers, and cargo buses.', slide2_badge: 'Commercial Vehicle',
    slide3_title: 'Balance Transfer & Top-up', slide3_description: 'Transfer your high-interest auto loan to our network banks and unlock additional liquidity with top-up features.', slide3_badge: 'Refinancing',
    slide4_title: 'Join as a Partner DSA', slide4_description: 'Earn up to 1.5% payout with a standard 90/10 agent split model. Complete Maker-Checker transparency.', slide4_badge: 'Earn Commissions'
  });
  const [socialForm, setSocialForm] = useState({
    instagram_url: 'https://instagram.com', facebook_url: 'https://facebook.com', linkedin_url: 'https://linkedin.com', twitter_url: 'https://twitter.com'
  });
  const [securityForm, setSecurityForm] = useState({
    rate_limit_public_max: '60', rate_limit_public_window: '60', rate_limit_authenticated_max: '300',
    rate_limit_authenticated_window: '60', rate_limit_auth_max: '20', rate_limit_auth_window: '60',
    auth_backoff_threshold_ip: '3', auth_backoff_threshold_acc: '3', auth_backoff_base_seconds: '2',
    auth_backoff_factor: '2', auth_backoff_decay_minutes: '15', max_upload_size_mb: '5'
  });

  useEffect(() => {
    if (isAdmin) {
      const fetchSettings = async () => {
        try {
          const res = await api.get('/settings');
          const s = res.data.settings || {};
          setSystemForm({
            app_name: s.app_name || 'LeadFlow Pro', company_name: s.company_name || 'LeadFlow Pro',
            support_email: s.support_email || 'support@leadflowpro.com', contact_number: s.contact_number || '+91 98765 43210',
            office_address: s.office_address || '102, Business Arcade, Main Road, New Delhi, India',
            whatsapp_number: s.whatsapp_number || '+91 98765 43210', default_currency: s.default_currency || 'INR',
            system_timezone: s.system_timezone || 'Asia/Kolkata', session_timeout: s.session_timeout || '120',
            maintenance_mode: s.maintenance_mode === '1'
          });
          setFinancialForm({ default_tds_rate: s.default_tds_rate || '5', default_processing_fee: s.default_processing_fee || '0' });
          setWorkflowForm({ default_lead_status: s.default_lead_status || 'New', followup_sla_days: s.followup_sla_days || '3' });
          setSMTPForm({ smtp_host: s.smtp_host || '', smtp_port: s.smtp_port || '587', smtp_user: s.smtp_user || '', smtp_pass: s.smtp_pass || '' });
          setSlideshowForm({
            slide1_title: s.slide1_title || 'Passenger Cars Finance', slide1_description: s.slide1_description || 'Low-interest rates starting at 9.5% p.a. for hatchbacks, sedans, and luxury SUVs with flexible tenures up to 7 years.', slide1_badge: s.slide1_badge || 'Passenger Vehicle',
            slide2_title: s.slide2_title || 'Commercial & Cargo Trucks', slide2_description: s.slide2_description || 'Empower your transport business. Funding up to 90% LTV on loaders, commercial trailers, and cargo buses.', slide2_badge: s.slide2_badge || 'Commercial Vehicle',
            slide3_title: s.slide3_title || 'Balance Transfer & Top-up', slide3_description: s.slide3_description || 'Transfer your high-interest auto loan to our network banks and unlock additional liquidity with top-up features.', slide3_badge: s.slide3_badge || 'Refinancing',
            slide4_title: s.slide4_title || 'Join as a Partner DSA', slide4_description: s.slide4_description || 'Earn up to 1.5% payout with a standard 90/10 agent split model. Complete Maker-Checker transparency.', slide4_badge: s.slide4_badge || 'Earn Commissions'
          });
          setSocialForm({ instagram_url: s.instagram_url || 'https://instagram.com', facebook_url: s.facebook_url || 'https://facebook.com', linkedin_url: s.linkedin_url || 'https://linkedin.com', twitter_url: s.twitter_url || 'https://twitter.com' });
          setSecurityForm({
            rate_limit_public_max: s.rate_limit_public_max || '60', rate_limit_public_window: s.rate_limit_public_window || '60',
            rate_limit_authenticated_max: s.rate_limit_authenticated_max || '300', rate_limit_authenticated_window: s.rate_limit_authenticated_window || '60',
            rate_limit_auth_max: s.rate_limit_auth_max || '20', rate_limit_auth_window: s.rate_limit_auth_window || '60',
            auth_backoff_threshold_ip: s.auth_backoff_threshold_ip || '3', auth_backoff_threshold_acc: s.auth_backoff_threshold_acc || '3',
            auth_backoff_base_seconds: s.auth_backoff_base_seconds || '2', auth_backoff_factor: s.auth_backoff_factor || '2',
            auth_backoff_decay_minutes: s.auth_backoff_decay_minutes || '15', max_upload_size_mb: s.max_upload_size_mb || '5'
          });
        } catch (err) { console.error("Failed to load settings", err); }
        finally { setLoading(false); }
      };
      fetchSettings();
    } else { setLoading(false); }
  }, [isAdmin]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileForm.new_password && profileForm.new_password !== profileForm.confirm_password) { alert("New passwords do not match."); return; }
    try {
      await api.put('/setup/users', { id: user?.id, name: profileForm.name, email: profileForm.email, password: profileForm.new_password, role: user?.role, is_active: 1 });
      setUser({ ...user!, name: profileForm.name, email: profileForm.email });
      setSuccessMsg('Profile updated successfully.');
      setProfileForm({ ...profileForm, current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) { alert(err.response?.data?.error || "Failed to update profile."); }
  };

  const handleSettingsSave = async (e: React.FormEvent, formType: string) => {
    e.preventDefault();
    try {
      let dataToSave: any = {};
      if (formType === 'system') dataToSave = { ...systemForm, maintenance_mode: systemForm.maintenance_mode ? '1' : '0' };
      else if (formType === 'financial') dataToSave = financialForm;
      else if (formType === 'workflow') dataToSave = workflowForm;
      else if (formType === 'smtp') dataToSave = smtpForm;
      else if (formType === 'slideshow') dataToSave = slideshowForm;
      else if (formType === 'socials') dataToSave = socialForm;
      else if (formType === 'security') dataToSave = securityForm;
      
      await api.post('/settings', dataToSave);
      await fetchSettings();
      setSuccessMsg('Settings updated successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch { alert("Failed to save settings."); }
  };

  const inputClass = "w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-800 dark:text-white transition-all";
  const labelClass = "block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5";

  if (loading) return <div className="flex flex-col items-center justify-center h-96 gap-3"><div className="relative w-10 h-10"><div className="absolute inset-0 rounded-full border-[3px] border-indigo-100 dark:border-indigo-500/20" /><div className="absolute inset-0 rounded-full border-[3px] border-t-indigo-600 animate-spin" /></div><p className="text-xs text-slate-400 font-medium">Loading settings...</p></div>;

  return (
    <div className="space-y-6 pb-12 animate-fade-in select-none max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <SettingsIcon className="text-indigo-500 w-5 h-5" /> Settings
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            Configure user profile and global system parameters.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold animate-slide-up">
          <CheckCircle className="w-5 h-5 text-emerald-500" /> {successMsg}
        </div>
      )}

      <div className="card overflow-hidden flex flex-col md:flex-row min-h-[550px]">
        
        {/* Sidebar Nav */}
        <div className="w-full md:w-56 bg-slate-50/50 dark:bg-slate-900/30 border-r border-slate-100 dark:border-slate-800 p-3 flex flex-col">
          {['Personal', 'Global Project'].map(group => {
            const groupTabs = tabs.filter(t => t.group === group && (!t.restricted || isAdmin));
            if (groupTabs.length === 0) return null;
            
            return (
              <div key={group} className="mb-4">
                <h3 className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-2 ml-1">{group}</h3>
                <nav className="space-y-1">
                  {groupTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={clsx(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                        activeTab === tab.id 
                          ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-slate-700 shadow-sm" 
                          : "text-slate-600 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:bg-slate-800/40 border-transparent"
                      )}
                    >
                      <tab.icon className={clsx("w-4 h-4 shrink-0", activeTab === tab.id ? "opacity-100" : "opacity-60")} />
                      {tab.label}
                      {tab.badge && activeTab === tab.id && <span className="ml-auto px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">{tab.badge}</span>}
                    </button>
                  ))}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-6 max-w-xl text-sm">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-5 h-5 text-slate-400" />
                  <h2 className="text-base font-bold text-slate-850 dark:text-white">Profile Information</h2>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  {isRestrictedIdentity 
                    ? "Your profile identity is managed by system administrators. You can update your login password below." 
                    : "Update your account's profile information and email address."}
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Full Name {isRestrictedIdentity && <span className="text-rose-500 font-normal">(Locked by Admin)</span>}</label>
                    <input type="text" disabled={isRestrictedIdentity} value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} 
                      className={clsx(inputClass, isRestrictedIdentity && "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed")} />
                  </div>
                  <div>
                    <label className={labelClass}>Email Address (Login ID) {isRestrictedIdentity && <span className="text-rose-500 font-normal">(Locked by Admin)</span>}</label>
                    <input type="email" disabled={isRestrictedIdentity} value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} 
                      className={clsx(inputClass, isRestrictedIdentity && "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed")} />
                  </div>
                  <div>
                    <label className={labelClass}>Account Role</label>
                    <input type="text" disabled value={user?.role?.replace('_', ' ').toUpperCase() || ''} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-500 cursor-not-allowed text-sm" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/5 dark:to-violet-500/5 border border-indigo-200/50 dark:border-indigo-800/30 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-base font-bold text-slate-850 dark:text-white">Change Password</h2>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2.5">Ensure your account is using a long, random password to stay secure.</p>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>New Password</label>
                      <input type="password" value={profileForm.new_password} onChange={e => setProfileForm({...profileForm, new_password: e.target.value})} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Confirm Password</label>
                      <input type="password" value={profileForm.confirm_password} onChange={e => setProfileForm({...profileForm, confirm_password: e.target.value})} className={inputClass} />
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-sm shadow-indigo-500/25">
                Save Profile
              </button>
            </form>
          )}

          {/* SYSTEM & IDENTITY */}
          {activeTab === 'system' && isAdmin && (
            <form onSubmit={e => handleSettingsSave(e, 'system')} className="space-y-6 max-w-2xl text-sm">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <SettingsIcon className="w-5 h-5 text-slate-400" />
                  <h2 className="text-base font-bold text-slate-850 dark:text-white">Global Branding & Identity</h2>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2.5">Configure brand identity, regional formatting, and base security.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={labelClass}>App Name</label><input type="text" value={systemForm.app_name} onChange={e => setSystemForm({...systemForm, app_name: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Company Name</label><input type="text" value={systemForm.company_name} onChange={e => setSystemForm({...systemForm, company_name: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Support Email</label><input type="email" value={systemForm.support_email} onChange={e => setSystemForm({...systemForm, support_email: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Contact Number</label><input type="text" value={systemForm.contact_number} onChange={e => setSystemForm({...systemForm, contact_number: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>WhatsApp Number</label><input type="text" value={systemForm.whatsapp_number} onChange={e => setSystemForm({...systemForm, whatsapp_number: e.target.value})} className={inputClass} /></div>
                  <div className="sm:col-span-2"><label className={labelClass}>Office Address</label><input type="text" value={systemForm.office_address} onChange={e => setSystemForm({...systemForm, office_address: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Default Currency</label><input type="text" value={systemForm.default_currency} onChange={e => setSystemForm({...systemForm, default_currency: e.target.value})} className={inputClass} /></div>
                  <div>
                    <label className={labelClass}>Timezone</label>
                    <select value={systemForm.system_timezone} onChange={e => setSystemForm({...systemForm, system_timezone: e.target.value})} className={inputClass}>
                      <option value="Asia/Kolkata">Asia/Kolkata</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Session Timeout (Mins)</label><input type="number" value={systemForm.session_timeout} onChange={e => setSystemForm({...systemForm, session_timeout: e.target.value})} className={inputClass} /></div>
                </div>

                <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50/50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 rounded-xl">
                  <input type="checkbox" id="maintenance" checked={systemForm.maintenance_mode} onChange={e => setSystemForm({...systemForm, maintenance_mode: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer" />
                  <label htmlFor="maintenance" className="font-semibold text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    Enable Maintenance Mode <span className="text-slate-400 font-normal ml-1">(Locks out non-admin users)</span>
                  </label>
                </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-sm shadow-indigo-500/25">
                Save Configurations
              </button>
            </form>
          )}

          {/* FINANCIAL DEFAULTS */}
          {activeTab === 'financial' && isAdmin && (
            <form onSubmit={e => handleSettingsSave(e, 'financial')} className="space-y-6 max-w-xl text-sm">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-5 h-5 text-slate-400" />
                  <h2 className="text-base font-bold text-slate-850 dark:text-white">Financial Defaults</h2>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2.5">Configure baseline rates for commissions and TDS.</p>
                
                <div className="space-y-4">
                  <div><label className={labelClass}>Default TDS Rate (%)</label><input type="number" step="0.01" value={financialForm.default_tds_rate} onChange={e => setFinancialForm({...financialForm, default_tds_rate: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Default Processing Fee</label><input type="number" value={financialForm.default_processing_fee} onChange={e => setFinancialForm({...financialForm, default_processing_fee: e.target.value})} className={inputClass} /></div>
                </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-sm shadow-indigo-500/25">
                Save Defaults
              </button>
            </form>
          )}

          {/* WORKFLOW */}
          {activeTab === 'workflow' && isAdmin && (
            <form onSubmit={e => handleSettingsSave(e, 'workflow')} className="space-y-6 max-w-xl text-sm">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Workflow className="w-5 h-5 text-slate-400" />
                  <h2 className="text-base font-bold text-slate-850 dark:text-white">Lead Workflow Rules</h2>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2.5">Set automation rules for leads and follow-ups.</p>
                
                <div className="space-y-4">
                  <div><label className={labelClass}>Default Lead Status</label><select value={workflowForm.default_lead_status} onChange={e => setWorkflowForm({...workflowForm, default_lead_status: e.target.value})} className={inputClass}><option value="New">New</option><option value="Pending Document">Pending Document</option><option value="Follow-up">Follow-up</option></select></div>
                  <div><label className={labelClass}>Follow-up SLA (Days)</label><input type="number" value={workflowForm.followup_sla_days} onChange={e => setWorkflowForm({...workflowForm, followup_sla_days: e.target.value})} className={inputClass} /></div>
                </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-sm shadow-indigo-500/25">
                Save Workflow Rules
              </button>
            </form>
          )}

          {/* SMTP */}
          {activeTab === 'smtp' && isAdmin && (
            <form onSubmit={e => handleSettingsSave(e, 'smtp')} className="space-y-6 max-w-xl text-sm">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <h2 className="text-base font-bold text-slate-850 dark:text-white">SMTP Server Configuration</h2>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2.5">Credentials for sending automated emails and receipts.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={labelClass}>SMTP Host</label><input type="text" value={smtpForm.smtp_host} onChange={e => setSMTPForm({...smtpForm, smtp_host: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>SMTP Port</label><input type="number" value={smtpForm.smtp_port} onChange={e => setSMTPForm({...smtpForm, smtp_port: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>SMTP Username</label><input type="text" value={smtpForm.smtp_user} onChange={e => setSMTPForm({...smtpForm, smtp_user: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>SMTP Password</label><input type="password" value={smtpForm.smtp_pass} onChange={e => setSMTPForm({...smtpForm, smtp_pass: e.target.value})} className={inputClass} /></div>
                </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-sm shadow-indigo-500/25">
                Save SMTP Config
              </button>
            </form>
          )}

          {/* SLIDESHOW */}
          {activeTab === 'slideshow' && isAdmin && (
            <form onSubmit={e => handleSettingsSave(e, 'slideshow')} className="space-y-6 max-w-2xl text-sm">
              <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/5 dark:to-violet-500/5 border border-indigo-200/50 dark:border-indigo-800/30 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-base font-bold text-slate-850 dark:text-white">Website Hero Slideshow Customization</h2>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  Customize the titles, badges, and descriptions for the auto-playing showcase slider on the landing page header.
                </p>
              </div>

              <div className="space-y-5">
                {[1, 2, 3, 4].map(num => {
                  const titleKey = `slide${num}_title` as keyof typeof slideshowForm;
                  const descKey = `slide${num}_description` as keyof typeof slideshowForm;
                  const badgeKey = `slide${num}_badge` as keyof typeof slideshowForm;

                  return (
                    <div key={num} className="p-5 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">Slide {num} Settings</h3>
                        <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">Landing Page</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Slide Title</label>
                          <input type="text" value={slideshowForm[titleKey]} onChange={e => setSlideshowForm({...slideshowForm, [titleKey]: e.target.value})} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Badge Text</label>
                          <input type="text" value={slideshowForm[badgeKey]} onChange={e => setSlideshowForm({...slideshowForm, [badgeKey]: e.target.value})} className={inputClass} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelClass}>Slide Description</label>
                          <textarea rows={2} value={slideshowForm[descKey]} onChange={e => setSlideshowForm({...slideshowForm, [descKey]: e.target.value})} className={clsx(inputClass, 'min-h-[80px] resize-none')} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-sm shadow-indigo-500/25">
                Save Slideshow Settings
              </button>
            </form>
          )}

          {/* SOCIALS */}
          {activeTab === 'socials' && isAdmin && (
            <form onSubmit={e => handleSettingsSave(e, 'socials')} className="space-y-6 max-w-xl text-sm">
              <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/5 dark:to-violet-500/5 border border-indigo-200/50 dark:border-indigo-800/30 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Share2 className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-base font-bold text-slate-850 dark:text-white">Social Media & Contact Hub Links</h2>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  Configure official brand URLs displayed in the floating support widget and throughout the application.
                </p>
              </div>

              <div className="space-y-4">
                <div><label className={labelClass}>Instagram Official Page URL</label><input type="url" value={socialForm.instagram_url} onChange={e => setSocialForm({...socialForm, instagram_url: e.target.value})} className={inputClass} placeholder="https://instagram.com/yourbrand" /></div>
                <div><label className={labelClass}>Facebook Official Page URL</label><input type="url" value={socialForm.facebook_url} onChange={e => setSocialForm({...socialForm, facebook_url: e.target.value})} className={inputClass} placeholder="https://facebook.com/yourbrand" /></div>
                <div><label className={labelClass}>LinkedIn Company Page URL</label><input type="url" value={socialForm.linkedin_url} onChange={e => setSocialForm({...socialForm, linkedin_url: e.target.value})} className={inputClass} placeholder="https://linkedin.com/company/yourbrand" /></div>
                <div><label className={labelClass}>Twitter / X Profile URL</label><input type="url" value={socialForm.twitter_url} onChange={e => setSocialForm({...socialForm, twitter_url: e.target.value})} className={inputClass} placeholder="https://twitter.com/yourbrand" /></div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-sm shadow-indigo-500/25">
                Save Social Channels
              </button>
            </form>
          )}

          {/* SECURITY */}
          {activeTab === 'security' && isAdmin && (
            <form onSubmit={e => handleSettingsSave(e, 'security')} className="space-y-6 max-w-2xl text-sm">
              <div className="p-4 bg-gradient-to-r from-rose-500/10 to-red-500/10 dark:from-rose-500/5 dark:to-red-500/5 border border-rose-200/50 dark:border-rose-500/20 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-base font-bold text-slate-850 dark:text-white">Endpoint Rate Limiting & Auth Backoff</h2>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  Configure request thresholds for public, authenticated, and authentication endpoints, and configure exponential backoff rules for failed login attempts.
                </p>
              </div>

              <div className="space-y-5">
                <div className="p-5 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-4">
                  <h3 className="font-extrabold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Sliding Window Rate Limits
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><label className={labelClass}>Public Endpoint Max Hits</label><input type="number" value={securityForm.rate_limit_public_max} onChange={e => setSecurityForm({...securityForm, rate_limit_public_max: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Public Window (Seconds)</label><input type="number" value={securityForm.rate_limit_public_window} onChange={e => setSecurityForm({...securityForm, rate_limit_public_window: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Authenticated Endpoint Max Hits</label><input type="number" value={securityForm.rate_limit_authenticated_max} onChange={e => setSecurityForm({...securityForm, rate_limit_authenticated_max: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Authenticated Window (Seconds)</label><input type="number" value={securityForm.rate_limit_authenticated_window} onChange={e => setSecurityForm({...securityForm, rate_limit_authenticated_window: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Auth Endpoint Max Hits</label><input type="number" value={securityForm.rate_limit_auth_max} onChange={e => setSecurityForm({...securityForm, rate_limit_auth_max: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Auth Window (Seconds)</label><input type="number" value={securityForm.rate_limit_auth_window} onChange={e => setSecurityForm({...securityForm, rate_limit_auth_window: e.target.value})} className={inputClass} /></div>
                  </div>
                </div>

                <div className="p-5 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-4">
                  <h3 className="font-extrabold text-sm text-rose-650 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Authentication Cooldown (Exponential Backoff)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><label className={labelClass}>IP Failed Attempts Threshold</label><input type="number" value={securityForm.auth_backoff_threshold_ip} onChange={e => setSecurityForm({...securityForm, auth_backoff_threshold_ip: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Account Failed Attempts Threshold</label><input type="number" value={securityForm.auth_backoff_threshold_acc} onChange={e => setSecurityForm({...securityForm, auth_backoff_threshold_acc: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Base Cooldown Delay (Seconds)</label><input type="number" value={securityForm.auth_backoff_base_seconds} onChange={e => setSecurityForm({...securityForm, auth_backoff_base_seconds: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Cooldown Factor (Multiplier)</label><input type="number" step="0.1" value={securityForm.auth_backoff_factor} onChange={e => setSecurityForm({...securityForm, auth_backoff_factor: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Failed Attempts Cache Expiry (Minutes)</label><input type="number" value={securityForm.auth_backoff_decay_minutes} onChange={e => setSecurityForm({...securityForm, auth_backoff_decay_minutes: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Max Upload Size (MB)</label><input type="number" value={securityForm.max_upload_size_mb} onChange={e => setSecurityForm({...securityForm, max_upload_size_mb: e.target.value})} className={inputClass} /></div>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-sm shadow-rose-500/25">
                Save Security Config
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}