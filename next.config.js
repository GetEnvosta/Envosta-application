/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async redirects() {
    return [
      // /features was renamed to /products. Permanent redirect preserves
      // any existing SEO weight and bookmarked links.
      { source: '/features', destination: '/products', permanent: true },
    ];
  },
};

module.exports = nextConfig;
