/**
 * Curated style presets modelled on WordPress Assembler theme variations.
 * Each preset maps to the studio's styleConfig shape (colors + fonts + layout).
 */

export type StudioStylePreset = {
  id: string;
  name: string;
  description: string;
  /** One-line hint about when this preset fits best. Used by the AI picker. */
  vibe: string;
  config: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      surface: string;
      text: string;
      textMuted: string;
      border: string;
    };
    fonts: { heading: string; body: string };
    borderRadius: string;
    maxWidth: string;
  };
};

export const STUDIO_PRESETS: StudioStylePreset[] = [
  {
    id: 'assembler-default',
    name: 'Assembler Default',
    description: 'Clean white canvas with black text — the neutral Assembler baseline.',
    vibe: 'Safe, modern, works for almost any business. Good default for minimal brands.',
    config: {
      colors: {
        background: '#FFFFFF', surface: '#F6F6F6', border: '#DDDDDD',
        primary: '#1E1E1E', secondary: '#333333', text: '#1E1E1E',
        textMuted: '#666666', accent: '#000000',
      },
      fonts: { heading: 'Inter', body: 'Inter' },
      borderRadius: '0',
      maxWidth: '620px',
    },
  },
  {
    id: 'editorial-serif',
    name: 'Editorial',
    description: 'Cream paper, warm serif headings — magazine feel.',
    vibe: 'Premium brands, law firms, boutique hotels, restaurants, long-form content.',
    config: {
      colors: {
        background: '#F8F4EC', surface: '#EFE7D6', border: '#C9BFA8',
        primary: '#2B1F12', secondary: '#4A3826', text: '#2B1F12',
        textMuted: '#6E5C48', accent: '#8B2E1F',
      },
      fonts: { heading: 'Playfair Display', body: 'Lora' },
      borderRadius: '0',
      maxWidth: '620px',
    },
  },
  {
    id: 'dark-mode',
    name: 'Midnight',
    description: 'Deep dark canvas with high-contrast type — modern and confident.',
    vibe: 'Tech, SaaS, agencies, creative studios, portfolios.',
    config: {
      colors: {
        background: '#0D0D10', surface: '#1A1A20', border: '#2A2A35',
        primary: '#F2F2F2', secondary: '#A0A0AE', text: '#F2F2F2',
        textMuted: '#8A8A9A', accent: '#7C5CFF',
      },
      fonts: { heading: 'Space Grotesk', body: 'Inter' },
      borderRadius: '4px',
      maxWidth: '620px',
    },
  },
  {
    id: 'warm-clay',
    name: 'Warm Clay',
    description: 'Soft terracotta + cream with rounded geometry.',
    vibe: 'Wellness, yoga, beauty, artisanal brands, cafés.',
    config: {
      colors: {
        background: '#FBF6EF', surface: '#F3E8D8', border: '#E1CFB4',
        primary: '#B24B2A', secondary: '#7A3A1F', text: '#3A1F10',
        textMuted: '#8A6A54', accent: '#D88A5E',
      },
      fonts: { heading: 'Fraunces', body: 'Source Sans 3' },
      borderRadius: '12px',
      maxWidth: '620px',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Deep green with warm cream accents — grounded and organic.',
    vibe: 'Landscaping, sustainability, outdoors, non-profits, naturopathy.',
    config: {
      colors: {
        background: '#F5F1E8', surface: '#E8E0CC', border: '#BFB89E',
        primary: '#1E3A2B', secondary: '#365D46', text: '#1E3A2B',
        textMuted: '#5B6F5F', accent: '#C4923C',
      },
      fonts: { heading: 'DM Serif Display', body: 'Source Sans 3' },
      borderRadius: '4px',
      maxWidth: '620px',
    },
  },
  {
    id: 'coastal',
    name: 'Coastal',
    description: 'Soft blue-grey with ocean accents — calm and professional.',
    vibe: 'Healthcare, financial services, consultants, real estate.',
    config: {
      colors: {
        background: '#F4F7FA', surface: '#E4ECF4', border: '#C2D3E2',
        primary: '#1B3A57', secondary: '#2F5A81', text: '#1B3A57',
        textMuted: '#5E7890', accent: '#3A9BBF',
      },
      fonts: { heading: 'Libre Baskerville', body: 'Source Sans 3' },
      borderRadius: '4px',
      maxWidth: '620px',
    },
  },
  {
    id: 'bold-brutal',
    name: 'Bold',
    description: 'High-contrast black on white with punchy accent — loud and confident.',
    vibe: 'Creative agencies, fashion, startups, bold personal brands.',
    config: {
      colors: {
        background: '#FFFFFF', surface: '#F0F0F0', border: '#000000',
        primary: '#000000', secondary: '#1A1A1A', text: '#000000',
        textMuted: '#666666', accent: '#FF3B00',
      },
      fonts: { heading: 'Space Grotesk', body: 'Inter' },
      borderRadius: '0',
      maxWidth: '1200px',
    },
  },
  {
    id: 'soft-pastel',
    name: 'Soft Pastel',
    description: 'Muted pastel palette, gentle and approachable.',
    vibe: 'Kids brands, beauty, stationery, events, weddings.',
    config: {
      colors: {
        background: '#FDF6F0', surface: '#F7E6E0', border: '#E8CCC4',
        primary: '#6B3E4E', secondary: '#8A5468', text: '#3A1F2A',
        textMuted: '#8A6A7A', accent: '#D98BA0',
      },
      fonts: { heading: 'Cormorant Garamond', body: 'Source Sans 3' },
      borderRadius: '16px',
      maxWidth: '620px',
    },
  },
];

export function getPresetById(id: string) {
  return STUDIO_PRESETS.find(p => p.id === id);
}
