import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRedteamOriginAllowed } from '../lib/redteam/origin-policy.js';

const trusted = 'https://drill.example.test';
const request = (host, origin, remoteAddress = '127.0.0.1', extra = {}) => ({
  headers: { host, origin, ...extra }, socket: { remoteAddress },
});

for (const [name, req, origins, expected] of [
  ['trusted HTTPS proxy', request('drill.example.test', trusted), trusted, true],
  ['public host needs configuration', request('drill.example.test', trusted), '', false],
  ['foreign browser origin', request('drill.example.test', 'https://evil.example'), trusted, false],
  ['HTTP downgrade', request('drill.example.test', 'http://drill.example.test'), trusted, false],
  ['host mismatch', request('evil.example', trusted), trusted, false],
  ['non-loopback transport', request('drill.example.test', trusted, '192.0.2.10'), trusted, false],
  ['forged forwarded host', request('evil.example', trusted, '127.0.0.1', { 'x-forwarded-host': 'drill.example.test' }), trusted, false],
  ['malformed origin', request('drill.example.test', '%%%'), trusted, false],
  ['local SSH tunnel', request('localhost:3723', 'http://localhost:3723'), '', true],
  ['foreign page targeting localhost', request('localhost:3723', 'https://evil.example'), '', false],
  ['desktop app', request('localhost:3721', 'app://dsh'), '', true],
  ['local non-browser client', request('localhost:3721', undefined), '', true],
]) {
  test(name, () => assert.equal(isRedteamOriginAllowed(req, origins), expected));
}
