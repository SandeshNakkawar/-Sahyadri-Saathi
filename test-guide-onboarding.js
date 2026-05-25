const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function runTest() {
  try {
    const baseURL = 'http://localhost:3000/api/v1';

    console.log('1. Registering new guide user...');
    let token;
    try {
      const registerRes = await axios.post(`${baseURL}/users/signup`, {
        name: 'New Test Guide',
        email: 'newguide@example.com',
        phone: '+91-9999911111',
        role: 'guide',
        password: 'guide1234',
        passwordConfirm: 'guide1234'
      });
      token = registerRes.data.token;
      console.log('✅ Registered new guide successfully!');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message.includes('duplicate')) {
        console.log('Guide already exists. Logging in instead...');
        const loginRes = await axios.post(`${baseURL}/users/login`, {
          email: 'newguide@example.com',
          password: 'guide1234'
        });
        token = loginRes.data.token;
        console.log('✅ Logged in successfully!');
      } else {
        throw err;
      }
    }

    const headers = {
      Authorization: `Bearer ${token}`
    };

    // Load a real image from the project to satisfy Sharp
    const realImgPath = path.join(__dirname, 'public', 'img', 'logo-green.png');
    const realImgBuffer = fs.readFileSync(realImgPath);

    console.log('\n2. Submitting text profile details and profile photo first via /onboarding...');
    const onboardingForm = new FormData();
    onboardingForm.append('displayName', 'New Test Guide');
    onboardingForm.append('bio', 'Hello, I am a high altitude trekking expert who loves fort history!');
    onboardingForm.append('baseCity', 'Satara');
    onboardingForm.append('experienceYears', '5');
    onboardingForm.append('pricePerDay', '1200');
    onboardingForm.append('halfDayPrice', '700');
    onboardingForm.append('maxGroupSize', '12');
    onboardingForm.append('travelRadiusKm', '60');
    onboardingForm.append('languages[]', 'Marathi');
    onboardingForm.append('languages[]', 'Hindi');
    onboardingForm.append('specialties[]', 'trekking');
    onboardingForm.append('specialties[]', 'history');

    // Create a mock image file as Blob
    const mockPhotoBlob = new Blob([realImgBuffer], { type: 'image/png' });
    onboardingForm.append('profilePhoto', mockPhotoBlob, 'logo-green.png');

    const onboardingRes = await axios.post(`${baseURL}/guide-profiles/onboarding`, onboardingForm, {
      headers: {
        ...headers
      }
    });

    console.log('✅ Onboarding details saved successfully!');

    console.log('\n3. Submitting verification documents via /submit-verification...');
    const verificationForm = new FormData();
    
    // Create mock document blobs
    const mockIdBlob = new Blob([realImgBuffer], { type: 'image/png' });
    const mockAddressBlob = new Blob([realImgBuffer], { type: 'image/png' });
    const mockCertBlob = new Blob([Buffer.from('%PDF-1.4 dummy pdf content')], { type: 'application/pdf' });

    verificationForm.append('idProof', mockIdBlob, 'id_proof.png');
    verificationForm.append('addressProof', mockAddressBlob, 'address_proof.png');
    verificationForm.append('certificate', mockCertBlob, 'certificate.pdf');

    // Optional but added by React form:
    verificationForm.append('displayName', 'New Test Guide');
    verificationForm.append('baseCity', 'Satara');
    verificationForm.append('pricePerDay', '1200');

    const verificationRes = await axios.post(`${baseURL}/guide-profiles/submit-verification`, verificationForm, {
      headers: {
        ...headers
      }
    });

    console.log('✅ Verification response status:', verificationRes.status);
    console.log('Verification response data:', JSON.stringify(verificationRes.data, null, 2));

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
