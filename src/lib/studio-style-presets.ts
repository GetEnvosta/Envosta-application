/**
 * Style presets for the studio.
 *
 * Two lists:
 *   - ASSEMBLER_VARIATIONS: reasonable approximations of the actual style
 *     variations that ship with Automattic's Assembler theme. Shown in
 *     Parent mode. Export in Parent mode emits a theme.json that matches
 *     the selected variation's palette so the child theme renders the
 *     same colors WordPress would.
 *   - CUSTOM_PRESETS: our own curated palettes (Editorial, Midnight, Warm
 *     Clay, etc.). Shown in Custom mode alongside AI Suggest + HTML upload.
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

// ─── Assembler parent-theme variations ──────────────────────────────
// Shown in Parent mode. Palettes model Assembler's style variations
// (see github.com/Automattic/themes/tree/trunk/assembler/styles).

export const ASSEMBLER_VARIATIONS: StudioStylePreset[] = [
  {
    id: 'assembler-default',
    name: 'Default',
    description: 'Assembler\'s default — white canvas, black ink, Inter.',
    vibe: 'Neutral, modern baseline — works for anything.',
    config: {
      colors: {
        background: '#FFFFFF', surface: '#F6F6F6', border: '#DDDDDD',
        primary: '#1E1E1E', secondary: '#333333', text: '#1E1E1E',
        textMuted: '#666666', accent: '#000000',
      },
      fonts: { heading: 'Inter', body: 'Inter' },
      borderRadius: '0', maxWidth: '620px',
    },
  },
  {
    id: 'assembler-ember',
    name: 'Ember',
    description: 'Warm charcoal with soft orange accent — night-mode editorial.',
    vibe: 'Tech, creative agencies, long-form writers.',
    config: {
      colors: {
        background: '#14161A', surface: '#1E2127', border: '#2B2F36',
        primary: '#F4EDE4', secondary: '#D9D1C5', text: '#F4EDE4',
        textMuted: '#9AA0A6', accent: '#E47A4E',
      },
      fonts: { heading: 'Inter', body: 'Inter' },
      borderRadius: '0', maxWidth: '620px',
    },
  },
  {
    id: 'assembler-onyx',
    name: 'Onyx',
    description: 'Pure black with crisp white — maximal contrast, zero ornament.',
    vibe: 'Fashion, photography, galleries, brutalist brands.',
    config: {
      colors: {
        background: '#000000', surface: '#111111', border: '#2A2A2A',
        primary: '#FFFFFF', secondary: '#E5E5E5', text: '#FFFFFF',
        textMuted: '#9A9A9A', accent: '#FFFFFF',
      },
      fonts: { heading: 'Inter', body: 'Inter' },
      borderRadius: '0', maxWidth: '620px',
    },
  },
  {
    id: 'assembler-pilgrim',
    name: 'Pilgrim',
    description: 'Sepia cream with deep espresso text — heritage editorial feel.',
    vibe: 'Law firms, vineyards, cafés, museums.',
    config: {
      colors: {
        background: '#F6EFE3', surface: '#EBE2D1', border: '#C9BDA4',
        primary: '#2B1F12', secondary: '#4A3826', text: '#2B1F12',
        textMuted: '#6E5C48', accent: '#8B2E1F',
      },
      fonts: { heading: 'DM Serif Display', body: 'Lora' },
      borderRadius: '0', maxWidth: '620px',
    },
  },
  {
    id: 'assembler-rainforest',
    name: 'Rainforest',
    description: 'Deep forest green with warm cream and brass accent.',
    vibe: 'Sustainability, outdoors, botanical, wellness.',
    config: {
      colors: {
        background: '#F3EFE4', surface: '#E7DFC9', border: '#BFB594',
        primary: '#1B3A2E', secondary: '#2F5644', text: '#1B3A2E',
        textMuted: '#556D60', accent: '#B08B2C',
      },
      fonts: { heading: 'Fraunces', body: 'Source Sans 3' },
      borderRadius: '0', maxWidth: '620px',
    },
  },
  {
    id: 'assembler-moonstone',
    name: 'Moonstone',
    description: 'Cool misty grey-blue with steel accent — clinical and calm.',
    vibe: 'Healthcare, finance, professional services, SaaS.',
    config: {
      colors: {
        background: '#F3F5F8', surface: '#E5EAF0', border: '#C4CDD7',
        primary: '#1F2B3A', secondary: '#35475E', text: '#1F2B3A',
        textMuted: '#5D6B7C', accent: '#3B7CB0',
      },
      fonts: { heading: 'Libre Baskerville', body: 'Source Sans 3' },
      borderRadius: '0', maxWidth: '620px',
    },
  },
  {
    id: 'assembler-bloom',
    name: 'Bloom',
    description: 'Soft pink on off-white with magenta accent — gentle and optimistic.',
    vibe: 'Beauty, weddings, lifestyle, boutique e-commerce.',
    config: {
      colors: {
        background: '#FDF6F0', surface: '#F7E6E0', border: '#E8CCC4',
        primary: '#6B3E4E', secondary: '#8A5468', text: '#3A1F2A',
        textMuted: '#8A6A7A', accent: '#D98BA0',
      },
      fonts: { heading: 'Cormorant Garamond', body: 'Source Sans 3' },
      borderRadius: '0', maxWidth: '620px',
    },
  },
];

// ─── Custom curated presets ─────────────────────────────────────────
// Shown in Custom mode. These are studio-opinionated looks that go
// beyond Assembler's defaults — more designer-chosen vibes.

export const CUSTOM_PRESETS: StudioStylePreset[] = [
  {
    id: 'custom-default',
    name: 'Clean Slate',
    description: 'Minimal white + black with rounded corners.',
    vibe: 'Safe, modern, works for almost any business.',
    config: {
      colors: {
        background: '#FFFFFF', surface: '#F6F6F6', border: '#DDDDDD',
        primary: '#1E1E1E', secondary: '#333333', text: '#1E1E1E',
        textMuted: '#666666', accent: '#000000',
      },
      fonts: { heading: 'Inter', body: 'Inter' },
      borderRadius: '6px',
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

/** All presets (both Assembler variations + Custom) — useful for lookup. */
export const STUDIO_PRESETS: StudioStylePreset[] = [...ASSEMBLER_VARIATIONS, ...CUSTOM_PRESETS];

export function getPresetById(id: string) {
  return STUDIO_PRESETS.find(p => p.id === id);
}
export function getAssemblerVariationById(id: string) {
  return ASSEMBLER_VARIATIONS.find(v => v.id === id);
}
