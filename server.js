const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'EstateMS SMS Proxy is running ✓' });
});

// Send SMS endpoint
app.post('/send-sms', async (req, res) => {
  const { phone, message, apiKey, username, senderId, env } = req.body;

  if (!phone || !message || !apiKey || !username) {
    return res.status(400).json({ error: 'Missing required fields: phone, message, apiKey, username' });
  }

  const url = env === 'production'
    ? 'https://api.africastalking.com/version1/messaging'
    : 'https://api.sandbox.africastalking.com/version1/messaging';

  const body = new URLSearchParams({ username, to: phone, message });
  if (senderId) body.append('from', senderId);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': apiKey
      },
      body: body.toString()
    });

    // Read raw text first so we never crash on non-JSON from AT
    const rawText = await response.text();
    console.log(`[${new Date().toISOString()}] AT response (${response.status}): ${rawText}`);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      // AT returned plain text error — return it so app can display it
      return res.status(500).json({ error: rawText });
    }

    res.json(data);

  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SMS Proxy running on port ${PORT}`));
