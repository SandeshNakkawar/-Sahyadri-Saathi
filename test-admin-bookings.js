const axios = require('axios');

async function runTest() {
  try {
    console.log('Logging in as admin...');
    const loginRes = await axios.post('http://localhost:3000/api/v1/users/login', {
      email: 'admin@sahyadrisaathi.com',
      password: 'admin1234'
    });

    const token = loginRes.data.token;
    console.log('✅ Logged in successfully. Token obtained.');

    console.log('Fetching all bookings via /api/v1/admin/bookings...');
    const bookingsRes = await axios.get('http://localhost:3000/api/v1/admin/bookings', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('✅ Fetch successful!');
    console.log('Response Status:', bookingsRes.status);
    console.log('Results count:', bookingsRes.data.results);
    console.log('Bookings:', JSON.stringify(bookingsRes.data.data.bookings, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.response ? {
      status: err.response.status,
      data: err.response.data
    } : err.message);
    process.exit(1);
  }
}

runTest();
