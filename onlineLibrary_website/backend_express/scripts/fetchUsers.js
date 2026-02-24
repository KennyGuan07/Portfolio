const http = require('http');
const app = require('../app');

const request = (options, body) => new Promise((resolve, reject) => {
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      resolve({ status: res.statusCode, body: data });
    });
  });
  req.on('error', reject);
  if (body) {
    req.write(body);
  }
  req.end();
});

const server = app.listen(0, async () => {
  const port = server.address().port;
  try {
    const payload = JSON.stringify({ email: 'admin@library.com', password: 'Admin123!' });
    const loginRes = await request({
      hostname: 'localhost',
      port,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, payload);

    console.log('Login status:', loginRes.status);
    console.log('Login body:', loginRes.body);

    const { token } = JSON.parse(loginRes.body);
    const usersRes = await request({
      hostname: 'localhost',
      port,
      path: '/api/users?page=1&limit=10&sortBy=createdAt&sortOrder=desc',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Users status:', usersRes.status);
    console.log('Users body:', usersRes.body);
  } catch (err) {
    console.error('Script error', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
