import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Backend REST API Endpoints', () => {
  it('GET /api/health returns UP status and system metadata', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.platform).toBeDefined();
  });

  it('GET /api/tools/status reports TShark and system tools status', async () => {
    const res = await request(app).get('/api/tools/status');
    expect(res.status).toBe(200);
    expect(res.body.tshark).toBeDefined();
    expect(res.body.tshark.backendParser).toBeDefined();
    expect(res.body.systemTools.pingAvailable).toBe(true);
  });

  it('GET /api/scenarios returns all 7 educational scenarios', async () => {
    const res = await request(app).get('/api/scenarios');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(7);
    expect(res.body[0].badge).toBe('SIMULATED');
  });

  it('GET /api/network/interfaces returns local network information', async () => {
    const res = await request(app).get('/api/network/interfaces');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.interfaces)).toBe(true);
    expect(res.body.status).toBeDefined();
  });

  it('POST /api/diagnostics/run rejects shell injection attempts and malformed targets', async () => {
    const maliciousPayloads = [
      'google.com; cat /etc/passwd',
      '127.0.0.1 && dir',
      '| ping 8.8.8.8',
      'invalid domain name with spaces',
    ];

    for (const target of maliciousPayloads) {
      const res = await request(app).post('/api/diagnostics/run').send({
        target,
        testType: 'QUICK',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    }
  });

  it('POST /api/diagnostics/run rejects invalid TCP port', async () => {
    const res = await request(app).post('/api/diagnostics/run').send({
      target: '127.0.0.1',
      tcpPort: 999999, // Exceeds 65535
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/lab/vlsm calculates and validates non-overlapping subnets', async () => {
    const res = await request(app).post('/api/lab/vlsm').send({
      baseNetwork: '192.168.1.0',
      baseCidr: 24,
      requirements: [
        { name: 'LAN A', requiredHosts: 60 },
        { name: 'LAN B', requiredHosts: 25 },
        { name: 'WAN Link', requiredHosts: 2 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.hasOverlap).toBe(false);
    expect(res.body.subnets.length).toBe(3);
  });
});
