const express = require('express');
const fetch = require('node-fetch');
const app = express();

const PROXY_SECRET = process.env.PROXY_SECRET || '';
const OPENSRS_HOST = process.env.OPENSRS_HOST || 'rr-n1-tor.opensrs.net';

app.use(express.text({ type: '*/*', limit: '1mb' }));

app.post('/', async (req, res) => {
  // Verify proxy secret
  if (PROXY_SECRET && req.headers['x-proxy-secret'] !== PROXY_SECRET) {
    return res.status(403).send('Forbidden');
  }

  try {
    const response = await fetch(`https://${OPENSRS_HOST}:55443`, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || 'text/xml',
        'X-Username': req.headers['x-username'] || '',
        'X-Signature': req.headers['x-signature'] || '',
      },
      body: req.body,
    });

    const text = await response.text();
    res.status(response.status).set('Content-Type', 'text/xml').send(text);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(502).send('Proxy error');
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`OpenSRS proxy on port ${PORT}`));
