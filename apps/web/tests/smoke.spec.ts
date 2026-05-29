import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'https://hosp-production-1719.up.railway.app';

test('api smoke: login and create patient', async ({ request }) => {
  const stamp = Date.now();

  const login = await request.post(`${API_URL}/api/auth/login`, {
    data: {
      email: 'admin@hospital.com',
      password: 'Admin@123',
      rememberMe: true,
    },
  });

  const loginText = await login.text();
  console.log('LOGIN STATUS:', login.status());
  console.log('LOGIN BODY:', loginText);

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
  console.log('CREATE PATIENT BODY:', patientText);

  expect(createPatient.ok()).toBeTruthy();

  const patientJson = JSON.parse(patientText);
  expect(patientJson.patient?.id).toBeTruthy();
});
