const http = require('http');
const app = require('../app');

const request = (options, body) => new Promise((resolve, reject) => {
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, body: data }));
  });
  req.on('error', reject);
  if (body) req.write(body);
  req.end();
});

const server = app.listen(0, async () => {
  const port = server.address().port;
  try {
    const payload = JSON.stringify({ email: 'user@library.com', password: 'User123!' });
    const login = await request({
      hostname: 'localhost',
      port,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, payload);
    console.log('login', login.status, login.body);
    const { token } = JSON.parse(login.body);
    const id = process.argv[2] || '6916225cfa04bffd7eb9ef56';
    const status = await request({
      hostname: 'localhost',
      port,
      path: `/api/books/${id}/borrow-status`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('borrow-status', status.status, status.body);
    process.exit(status.status >= 400 ? 1 : 0);
  } catch (err) {
    console.error('probe error', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
