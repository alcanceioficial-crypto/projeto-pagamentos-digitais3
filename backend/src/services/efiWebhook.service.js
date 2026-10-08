const axios = require('axios');
const https = require('https');
const fs = require('fs');

const baseURL =
  process.env.EFI_ENV === 'homolog'
    ? 'https://pix-h.api.efipay.com.br'
    : 'https://pix.api.efipay.com.br';

function httpsAgent() {
  return new https.Agent({
    pfx: fs.readFileSync(process.env.EFI_CERT_PATH),
    passphrase: '',
  });
}

async function getToken() {
  const response = await axios.post(
    `${baseURL}/oauth/token`,
    { grant_type: 'client_credentials' },
    {
      httpsAgent: httpsAgent(),
      auth: {
        username: process.env.EFI_CLIENT_ID,
        password: process.env.EFI_CLIENT_SECRET,
      },
    }
  );

  return response.data.access_token;
}

async function registrarWebhookPix() {
  const token = await getToken();

  const webhookUrl = `${process.env.BASE_URL}/webhook/pix?hmac=${process.env.EFI_WEBHOOK_HMAC}`;

  const response = await axios.put(
    `${baseURL}/v2/webhook/${process.env.EFI_PIX_KEY}`,
    { webhookUrl },
    {
      httpsAgent: httpsAgent(),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-skip-mtls-checking': 'true'
      },
    }
  );

  return response.data;
}

module.exports = {
  registrarWebhookPix
};
