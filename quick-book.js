const axios = require('axios');
const fs = require('fs');

(async () => {
  const API_BASE = 'http://localhost:8080/api/1.0';
  const tokenPath = __dirname + '/token.txt';
  let tokenContent = '';
  try {
    tokenContent = fs.readFileSync(tokenPath, 'utf8');
  } catch (e) {
    console.error('Failed to read token.txt:', e.message);
    process.exit(1);
  }

  // Extract a clean JWT from the token file (handles multi-line output)
  const lines = tokenContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
  const tokenLine = [...lines].reverse().find(l => jwtRegex.test(l)) || lines[lines.length - 1];
  const token = tokenLine.trim();

  const headers = {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  const payload = {
    mentorId: '68e91b69d8cd8ed49000e0b5',
    callType: 'chat',
    time: 5,
    type: 'instant'
  };

  try {
    const res = await axios.put(`${API_BASE}/slot/book`, payload, { headers });
    console.log('HTTP_STATUS', res.status);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('HTTP_ERROR', e.response ? e.response.status : e.message);
    console.log(JSON.stringify(e.response ? e.response.data : { message: e.message }, null, 2));
    process.exit(1);
  }
})();