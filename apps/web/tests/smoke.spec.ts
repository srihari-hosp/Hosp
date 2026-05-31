import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL;
const TEST_EMAIL = process.env.SMOKE_EMAIL;
const TEST_PASSWORD = process.env.SMOKE_PASSWORD;

if (!API_URL || !TEST_EMAIL || !TEST_PASSWORD) {
  throw new Error('API_URL, SMOKE_EMAIL and SMOKE_PASSWORD must be set for the smoke test.');
}

test('api smoke: login and create patient', async ({ request }) => {
  const stamp = Date.now();

  const login = await request.post(`${API_URL}/api/auth/login`, {
    data: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      rememberMe: true,
    },
  });

  const loginText = await login.text();
  console.log('LOGIN STATUS:', login.status());

  expect(login.ok()).toBeTruthy();

  const loginJson = JSON.parse(loginText);
  const accessToken = loginJson.accessToken || loginJson.data?.accessToken;
  expect(accessToken).toBeTruthy();

  const createPatient = await request.post(`${API_URL}/patients`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      mrn: `MRN-${stamp}`,
      name: 'krishna',
      age: 30,
      gender: 'MALE',
      phone: '9876543210',
      email: `patient${stamp}@example.com`,
      address: 'Hyderabad',
      patientType: 'OPD',
    },
  });

  const patientText = await createPatient.text();
  console.log('CREATE PATIENT STATUS:', createPatient.status());

  expect(createPatient.ok()).toBeTruthy();

  const patientJson = JSON.parse(patientText);
  const patientId = patientJson.patient?.id;
  if (patientId) {
    console.log('CREATE PATIENT ID:', `${patientId.substring(0, 8)}...`);
  }
  expect(patientId).toBeTruthy();
});
