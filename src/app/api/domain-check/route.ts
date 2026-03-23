import { NextResponse } from 'next/server';

const OPENSRS_USERNAME = process.env.OPENSRS_USERNAME ?? '';
const OPENSRS_API_KEY = process.env.OPENSRS_API_KEY ?? '';
const OPENSRS_HOST = process.env.OPENSRS_HOST ?? 'horizon.opensrs.net';

async function md5(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  // Use Web Crypto API (available in Edge Runtime)
  const hashBuffer = await crypto.subtle.digest('MD5', data).catch(() => null);
  if (hashBuffer) {
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback: use Node.js crypto
  const { createHash } = await import('crypto');
  return createHash('md5').update(input).digest('hex');
}

async function opensrsSignature(xml: string): Promise<string> {
  const step1 = await md5(xml + OPENSRS_API_KEY);
  return md5(step1 + OPENSRS_API_KEY);
}

export async function POST(req: Request) {
  try {
    const { domain } = await req.json();
    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 });
    }

    // Sanitize
    const cleanDomain = domain.toLowerCase().trim();
    if (cleanDomain.length > 253 || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanDomain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    const xml = `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="object">DOMAIN</item>
        <item key="action">LOOKUP</item>
        <item key="attributes">
          <dt_assoc>
            <item key="domain">${cleanDomain}</item>
            <item key="no_cache">1</item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;

    const signature = await opensrsSignature(xml);
    const res = await fetch(`https://${OPENSRS_HOST}:55443`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'X-Username': OPENSRS_USERNAME,
        'X-Signature': signature,
      },
      body: xml,
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Domain lookup failed' }, { status: 502 });
    }

    const responseXml = await res.text();
    const codeMatch = responseXml.match(/<item key="response_code">(.*?)<\/item>/);
    const code = codeMatch?.[1] ?? '';
    const available = code === '210';

    return NextResponse.json({ domain: cleanDomain, available });
  } catch (e: any) {
    console.error('Domain check error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
