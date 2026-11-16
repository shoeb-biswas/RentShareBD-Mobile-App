import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAppConfig, getPublicIntegrationStatus } from './env';
import { parseImageDataUrl } from '../services/uploadService';

test('parseAppConfig succeeds locally with only required MySQL and JWT env vars', () => {
  const cfg = parseAppConfig(
    {
      DB_CLIENT: 'mysql',
      MYSQL_HOST: 'localhost',
      MYSQL_PORT: '3306',
      MYSQL_USER: 'rentshare',
      MYSQL_PASSWORD: 'secret',
      MYSQL_DATABASE: 'rentshare_bd',
      JWT_SECRET: 'super-strong-local-secret-value-12345',
    },
    { hasEnvFile: true }
  );

  assert.equal(cfg.dbClient, 'mysql');
  assert.equal(cfg.jwtUsingEphemeralDevSecret, false);
  assert.equal(cfg.integrations.cloudinary.enabled, false);
  assert.equal(cfg.integrations.gemini.enabled, false);
  assert.equal(cfg.integrations.paymentGateways.sslcommerz.enabled, false);
  assert.equal(cfg.integrations.paymentGateways.bkash.enabled, false);
  assert.equal(cfg.integrations.paymentGateways.nagad.enabled, false);

  const pub = getPublicIntegrationStatus(cfg);
  assert.equal(pub.imageStorageMode, 'local_fallback');
  assert.equal(pub.paymentGateways.sslcommerzConfigured, false);
  assert.equal(pub.paymentGateways.bkashConfigured, false);
  assert.equal(pub.paymentGateways.nagadConfigured, false);
});

test('parseAppConfig rejects missing or placeholder JWT_SECRET when .env or production is active', () => {
  assert.throws(
    () =>
      parseAppConfig(
        {
          DB_CLIENT: 'mysql',
          MYSQL_HOST: 'localhost',
          MYSQL_USER: 'root',
          MYSQL_PASSWORD: '',
          MYSQL_DATABASE: 'rentshare_bd',
          JWT_SECRET: 'replace-with-a-strong-random-jwt-secret',
        },
        { hasEnvFile: true }
      ),
    /JWT_SECRET/
  );
});

test('parseAppConfig rejects missing MySQL credentials when DB_CLIENT=mysql without fallback', () => {
  assert.throws(
    () =>
      parseAppConfig(
        {
          DB_CLIENT: 'mysql',
          JWT_SECRET: 'valid-secret-key-at-least-16-chars',
        },
        { hasEnvFile: true }
      ),
    /MYSQL_HOST/
  );
});

test('parseAppConfig enables optional payment gateways and Cloudinary only when complete credentials exist', () => {
  const cfg = parseAppConfig(
    {
      DB_CLIENT: 'mysql',
      MYSQL_HOST: '127.0.0.1',
      MYSQL_USER: 'rentshare',
      MYSQL_PASSWORD: 'pw',
      MYSQL_DATABASE: 'rentshare_bd',
      JWT_SECRET: 'valid-secret-key-at-least-16-chars',
      CHAT_SERVICE_URL: 'http://localhost:3005/',
      CHAT_CORS_ORIGIN: 'http://localhost:3000,http://127.0.0.1:3000',
      CLOUDINARY_CLOUD_NAME: 'demo-cloud',
      CLOUDINARY_API_KEY: '12345',
      CLOUDINARY_API_SECRET: 'abcde',
      SSLCOMMERZ_STORE_ID: 'store1',
      SSLCOMMERZ_STORE_PASSWORD: 'pass1',
      // Incomplete bKash should stay disabled
      BKASH_APP_KEY: 'only-key',
    },
    { hasEnvFile: true }
  );

  assert.equal(cfg.chatServiceUrl, 'http://localhost:3005');
  assert.deepEqual(cfg.chatCorsOrigins, ['http://localhost:3000', 'http://127.0.0.1:3000']);
  assert.equal(cfg.integrations.cloudinary.enabled, true);
  assert.equal(cfg.integrations.paymentGateways.sslcommerz.enabled, true);
  assert.equal(cfg.integrations.paymentGateways.bkash.enabled, false);
});

test('parseImageDataUrl validates allowed image formats for local upload fallback', () => {
  const pngBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const parsed = parseImageDataUrl(pngBase64);
  assert.equal(parsed.mimeType, 'image/png');
  assert.equal(parsed.ext, 'png');
  assert.ok(parsed.buffer.length > 0);

  assert.throws(() => parseImageDataUrl('data:text/plain;base64,SGVsbG8='), /Invalid image payload/);
  assert.throws(
    () => parseImageDataUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='),
    /Unsupported image format/
  );
});
