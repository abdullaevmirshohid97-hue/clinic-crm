/**
 * Patient routes authorization tests.
 * Verifies role-based access control for patient data — a HIPAA-sensitive area.
 * Uses NODE_ENV=test auth bypass (x-test-role header).
 */
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, authHeaders, VALID_UUID } from '../../helpers/setup';
import patientRouter from '../../../src/modules/patient/patient.routes';

const VALID_PATIENT_BODY = JSON.stringify({
  full_name: 'Aziz Karimov',
  phone: '+998901234567',
  gender: 'male',
});

describe('GET /patients — who can view patient list', () => {
  test('admin can view patient list', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients`, { headers: authHeaders('admin') });
      assert.notEqual(res.status, 403);
      assert.notEqual(res.status, 401);
    } finally { await server.close(); }
  });

  test('doctor can view patient list', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients`, { headers: authHeaders('doctor') });
      assert.notEqual(res.status, 403);
    } finally { await server.close(); }
  });

  test('nurse can view patient list', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients`, { headers: authHeaders('nurse') });
      assert.notEqual(res.status, 403);
    } finally { await server.close(); }
  });

  test('cashier CANNOT view patient list', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients`, { headers: authHeaders('cashier') });
      assert.equal(res.status, 403);
    } finally { await server.close(); }
  });

  test('reception CANNOT view patient list', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients`, { headers: authHeaders('reception') });
      assert.equal(res.status, 403);
    } finally { await server.close(); }
  });
});

describe('GET /patients/:id — who can view individual patient', () => {
  test('doctor can view individual patient record', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients/${VALID_UUID}`, { headers: authHeaders('doctor') });
      assert.notEqual(res.status, 403);
      assert.notEqual(res.status, 401);
    } finally { await server.close(); }
  });

  test('cashier CANNOT view individual patient', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients/${VALID_UUID}`, { headers: authHeaders('cashier') });
      assert.equal(res.status, 403);
    } finally { await server.close(); }
  });
});

describe('POST /patients — who can create patients', () => {
  test('admin can create a patient', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients`, {
        method: 'POST',
        headers: authHeaders('admin'),
        body: VALID_PATIENT_BODY,
      });
      assert.notEqual(res.status, 403);
      assert.notEqual(res.status, 401);
    } finally { await server.close(); }
  });

  test('doctor can create a patient', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients`, {
        method: 'POST',
        headers: authHeaders('doctor'),
        body: VALID_PATIENT_BODY,
      });
      assert.notEqual(res.status, 403);
    } finally { await server.close(); }
  });

  test('nurse CANNOT create a patient', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients`, {
        method: 'POST',
        headers: authHeaders('nurse'),
        body: VALID_PATIENT_BODY,
      });
      assert.equal(res.status, 403);
    } finally { await server.close(); }
  });

  test('cashier CANNOT create a patient', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients`, {
        method: 'POST',
        headers: authHeaders('cashier'),
        body: VALID_PATIENT_BODY,
      });
      assert.equal(res.status, 403);
    } finally { await server.close(); }
  });

  test('reception CANNOT create a patient', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients`, {
        method: 'POST',
        headers: authHeaders('reception'),
        body: VALID_PATIENT_BODY,
      });
      assert.equal(res.status, 403);
    } finally { await server.close(); }
  });
});

describe('POST /patients — schema validation', () => {
  test('returns 400 when full_name is too short (< 2 chars)', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients`, {
        method: 'POST',
        headers: authHeaders('admin'),
        body: JSON.stringify({ full_name: 'A' }),
      });
      assert.equal(res.status, 400);
      const body = await res.json() as any;
      assert.equal(body.message, 'Validation failed');
    } finally { await server.close(); }
  });

  test('returns 400 when full_name is missing entirely', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients`, {
        method: 'POST',
        headers: authHeaders('admin'),
        body: JSON.stringify({ phone: '+998901234567' }),
      });
      assert.equal(res.status, 400);
    } finally { await server.close(); }
  });

  test('returns 400 when gender is an invalid value', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients`, {
        method: 'POST',
        headers: authHeaders('admin'),
        body: JSON.stringify({ full_name: 'Aziz', gender: 'unknown' }),
      });
      assert.equal(res.status, 400);
    } finally { await server.close(); }
  });

  test('accepts optional fields (phone, birth_date, notes can be omitted)', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients`, {
        method: 'POST',
        headers: authHeaders('admin'),
        body: JSON.stringify({ full_name: 'Minimal Patient' }),
      });
      // Validation passes — service layer may fail (no Supabase), but not a 400
      if (res.status === 400) {
        const body = await res.json() as any;
        assert.notEqual(body.message, 'Validation failed', 'Should not be a validation error');
      }
    } finally { await server.close(); }
  });
});

describe('PUT /patients/:id — update authorization', () => {
  const validUpdate = JSON.stringify({ full_name: 'Updated Name' });

  test('admin can update patient', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients/${VALID_UUID}`, {
        method: 'PUT',
        headers: authHeaders('admin'),
        body: validUpdate,
      });
      assert.notEqual(res.status, 403);
      assert.notEqual(res.status, 401);
    } finally { await server.close(); }
  });

  test('nurse CANNOT update patient', async () => {
    const server = await startTestServer(patientRouter, '/patients');
    try {
      const res = await fetch(`${server.url}/patients/${VALID_UUID}`, {
        method: 'PUT',
        headers: authHeaders('nurse'),
        body: validUpdate,
      });
      assert.equal(res.status, 403);
    } finally { await server.close(); }
  });
});
