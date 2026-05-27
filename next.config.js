/** @type {import('next').NextConfig} */
const { withWorkflow } = require('workflow/next');

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

// withWorkflow() enables the `'use workflow'` and `'use step'` directives
// for Vercel Workflows SDK. Required for any file in src/app/workflows/.
// Without this wrapper, workflow files fall through as plain functions
// and `start()` from `workflow/api` will throw at runtime.
module.exports = withWorkflow(nextConfig);
