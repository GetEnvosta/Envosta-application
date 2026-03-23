import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

function md5(input: string): string {
  return createHash('md5').update(input).digest('hex');
}

function opensrsSignature(xml: string, apiKey: string): string {
  const step1 = md5(xml + apiKey);
  return md5(step1 + apiKey);
}

export async function POST(req: Request) {
  const OPENSRS_USERNAME = process.env.OPENSRS_USERNAME ?? '';
  const OPENSRS_API_KEY = process.env.OPENSRS_API_KEY ?? '';
  const OPENSRS_HOST = process.env.OPENSRS_HOST ?? 'horizon.opensrs.net';

  if (!OPENSRS_USERNAME || !OPENSRS_API_KEY) {
    console.error('OpenSRS credentials not configured');
    return NextResponse.json({ error: 'Domain lookup service not configured' }, { status: 503 });
  }

  try {
    const { domain } = await req.json();
    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 });
    }

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

    const signature = opensrsSignature(xml, OPENSRS_API_KEY);

    const res = await fetch(`https://${OPENSRS_HOST}:55443`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'X-Username': OPENSRS_USERNAME,
        'X-Signature': signature,
      },
      body: xml,
    });

    const responseXml = await res.text();
    console.log('OpenSRS lookup response:', responseXml.substring(0, 500));

    if (!res.ok) {
      console.error('OpenSRS HTTP error:', res.status, responseXml.substring(0, 300));
      return NextResponse.json({ error: 'Domain lookup failed' }, { status: 502 });
    }

    // Parse response code: 210 = available, 211 = taken
    const codeMatch = responseXml.match(/<item key="response_code">(.*?)<\/item>/);
    const textMatch = responseXml.match(/<item key="response_text">(.*?)<\/item>/);
    const code = codeMatch?.[1]?.trim() ?? '';
    const text = textMatch?.[1]?.trim() ?? '';

    console.log('OpenSRS lookup:', cleanDomain, 'code:', code, 'text:', text);

    // 210 = available, 211 = taken, anything else = error
    if (code === '210') {
      return NextResponse.json({ domain: cleanDomain, available: true });
    } else if (code === '211') {
      return NextResponse.json({ domain: cleanDomain, available: false });
    } else {
      // Auth error or other issue
      console.error('OpenSRS unexpected response:', code, text);
      return NextResponse.json({ error: text || 'Domain lookup failed' }, { status: 502 });
    }
  } catch (e: any) {
    console.error('Domain check error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
