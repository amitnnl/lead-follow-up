import { create } from 'zustand';
import api from '../lib/axios';

interface SettingsState {
  settings: {
    app_name: string;
    company_name: string;
    contact_number: string;
    support_email: string;
    office_address: string;
    whatsapp_number: string;
    instagram_url?: string;
    facebook_url?: string;
    linkedin_url?: string;
    twitter_url?: string;
    // Slideshow
    slide1_title: string;
    slide1_description: string;
    slide1_badge: string;
    slide2_title: string;
    slide2_description: string;
    slide2_badge: string;
    slide3_title: string;
    slide3_description: string;
    slide3_badge: string;
    slide4_title: string;
    slide4_description: string;
    slide4_badge: string;
  };
  loading: boolean;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {
    app_name: 'LeadFlow Pro',
    company_name: 'LeadFlow Pro',
    contact_number: '+91 98765 43210',
    support_email: 'support@leadflowpro.com',
    office_address: '102, Business Arcade, Main Road, New Delhi, India',
    whatsapp_number: '+91 98765 43210',
    instagram_url: 'https://instagram.com',
    facebook_url: 'https://facebook.com',
    linkedin_url: 'https://linkedin.com',
    twitter_url: 'https://twitter.com',
    // Slideshow
    slide1_title: 'Passenger Cars Finance',
    slide1_description: 'Low-interest rates starting at 9.5% p.a. for hatchbacks, sedans, and luxury SUVs with flexible tenures up to 7 years.',
    slide1_badge: 'Passenger Vehicle',
    slide2_title: 'Commercial & Cargo Trucks',
    slide2_description: 'Empower your transport business. Funding up to 90% LTV on loaders, commercial trailers, and cargo buses.',
    slide2_badge: 'Commercial Vehicle',
    slide3_title: 'Balance Transfer & Top-up',
    slide3_description: 'Transfer your high-interest auto loan to our network banks and unlock additional liquidity with top-up features.',
    slide3_badge: 'Refinancing',
    slide4_title: 'Join as a Partner DSA',
    slide4_description: 'Earn up to 1.5% payout with a standard 90/10 agent split model. Complete Maker-Checker transparency.',
    slide4_badge: 'Earn Commissions'
  },
  loading: true,
  fetchSettings: async () => {
    try {
      const res = await api.get('/settings/public');
      if (res.data?.settings) {
        set({ settings: res.data.settings, loading: false });
      }
    } catch (err) {
      console.error("Failed to load settings", err);
      set({ loading: false });
    }
  }
}));
