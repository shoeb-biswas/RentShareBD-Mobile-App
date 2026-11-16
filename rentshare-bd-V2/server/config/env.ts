import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  appUrl: string;
  chatServicePort: number;
  chatServiceUrl: string;
  chatCorsOrigins: string[];
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtUsingEphemeralDevSecret: boolean;
  dbClient: 'mysql' | 'sqlite_fallback';
  allowSqliteFallback: boolean;
  mysql: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  integrations: {
    gemini: {
      enabled: boolean;
      apiKey: string;
    };
    cloudinary: {
      enabled: boolean;
      cloudName: string;
      apiKey: string;
      apiSecret: string;
    };
    paymentGateways: {
      sslcommerz: {
        enabled: boolean;
        sandbox: boolean;
        storeId: string;
        storePassword: string;
      };
      bkash: {
        enabled: boolean;
        sandbox: boolean;
        appKey: string;
        appSecret: string;
        username: string;
        password: string;
      };
      nagad: {
        enabled: boolean;
        sandbox: boolean;
        merchantId: string;
        publicKey: string;
        privateKey: string;
      };
    };
  };
}

const PLACEHOLDER_VALUES = new Set([
  'MY_GEMINI_API_KEY',
  'MY_APP_URL',
  'replace-with-a-strong-random-jwt-secret',
  'change-me',
  'your-secret-here',
]);

export function isConfiguredValue(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('MY_')) return false;
  if (PLACEHOLDER_VALUES.has(trimmed)) return false;
  return true;
}

let cachedEphemeralSecret: string | null = null;

function getEphemeralDevSecret(): string {
  if (!cachedEphemeralSecret) {
    cachedEphemeralSecret = crypto.randomBytes(32).toString('hex');
  }
  return cachedEphemeralSecret;
}

export function parseAppConfig(
  env: NodeJS.ProcessEnv,
  options: { hasEnvFile?: boolean } = {}
): AppConfig {
  const nodeEnv = env.NODE_ENV || 'development';
  const hasEnvFile =
    options.hasEnvFile ?? fs.existsSync(path.resolve(process.cwd(), '.env'));
  const isStrict = nodeEnv === 'production' || env.STRICT_ENV_VALIDATION === 'true';

  const rawPort = env.SERVER_PORT || (!hasEnvFile && nodeEnv !== 'production' && env.PORT === '8080' ? '3000' : env.PORT);
  const port = Number(rawPort || 3000);
  const appUrl = (env.APP_URL && isConfiguredValue(env.APP_URL) ? env.APP_URL : `http://localhost:${port}`).replace(
    /\/+$/,
    ''
  );

  const chatServicePort = Number(env.CHAT_SERVICE_PORT || 3001);
  const chatServiceUrl = (
    isConfiguredValue(env.CHAT_SERVICE_URL)
      ? env.CHAT_SERVICE_URL!
      : `http://localhost:${chatServicePort}`
  ).replace(/\/+$/, '');

  const rawCors = env.CHAT_CORS_ORIGIN || '';
  const chatCorsOrigins = rawCors
    ? rawCors
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : Array.from(
        new Set([
          appUrl,
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ])
      );

  // Required Core 1: JWT Authentication
  const rawJwtSecret = env.JWT_SECRET;
  const jwtConfigured = isConfiguredValue(rawJwtSecret);
  if ((isStrict || hasEnvFile) && !jwtConfigured) {
    throw new Error(
      'Missing required environment variable: JWT_SECRET. Set a strong random secret (e.g. 32+ characters) in .env before starting the server.'
    );
  }
  const jwtSecret = jwtConfigured ? rawJwtSecret!.trim() : getEphemeralDevSecret();
  const jwtUsingEphemeralDevSecret = !jwtConfigured;

  // Required Core 2: MySQL Database Configuration
  const explicitDbClient = (env.DB_CLIENT || '').trim().toLowerCase();
  const mysqlHost = (env.MYSQL_HOST || '').trim();
  const mysqlPort = Number(env.MYSQL_PORT || 3306);
  const mysqlUser = (env.MYSQL_USER || '').trim();
  const mysqlPassword = env.MYSQL_PASSWORD ?? '';
  const mysqlDatabase = (env.MYSQL_DATABASE || '').trim();

  const shouldValidateMysql =
    isStrict || hasEnvFile || explicitDbClient === 'mysql';
  const allowSqliteFallback =
    env.ALLOW_SQLITE_FALLBACK === 'true' || (!hasEnvFile && !isStrict && explicitDbClient !== 'mysql');

  if (shouldValidateMysql && !allowSqliteFallback) {
    const missingMysql: string[] = [];
    if (!isConfiguredValue(mysqlHost)) missingMysql.push('MYSQL_HOST');
    if (!isConfiguredValue(mysqlUser)) missingMysql.push('MYSQL_USER');
    if (!isConfiguredValue(mysqlDatabase)) missingMysql.push('MYSQL_DATABASE');
    if (env.MYSQL_PASSWORD === undefined) missingMysql.push('MYSQL_PASSWORD');

    if (missingMysql.length > 0) {
      throw new Error(
        `Missing required MySQL environment variable(s): ${missingMysql.join(', ')}. Configure MySQL credentials in .env.`
      );
    }
  }

  const dbClient: 'mysql' | 'sqlite_fallback' =
    explicitDbClient === 'sqlite' || (!isConfiguredValue(mysqlHost) && allowSqliteFallback)
      ? 'sqlite_fallback'
      : 'mysql';

  // Optional Integrations
  const geminiKey = isConfiguredValue(env.GEMINI_API_KEY) ? env.GEMINI_API_KEY!.trim() : '';

  const cloudName = isConfiguredValue(env.CLOUDINARY_CLOUD_NAME) ? env.CLOUDINARY_CLOUD_NAME!.trim() : '';
  const cloudKey = isConfiguredValue(env.CLOUDINARY_API_KEY) ? env.CLOUDINARY_API_KEY!.trim() : '';
  const cloudSecret = isConfiguredValue(env.CLOUDINARY_API_SECRET) ? env.CLOUDINARY_API_SECRET!.trim() : '';
  const cloudinaryEnabled = Boolean(cloudName && cloudKey && cloudSecret);

  const sslStoreId = isConfiguredValue(env.SSLCOMMERZ_STORE_ID) ? env.SSLCOMMERZ_STORE_ID!.trim() : '';
  const sslStorePass = isConfiguredValue(env.SSLCOMMERZ_STORE_PASSWORD)
    ? env.SSLCOMMERZ_STORE_PASSWORD!.trim()
    : '';
  const sslEnabled = Boolean(sslStoreId && sslStorePass);

  const bkashKey = isConfiguredValue(env.BKASH_APP_KEY) ? env.BKASH_APP_KEY!.trim() : '';
  const bkashSecret = isConfiguredValue(env.BKASH_APP_SECRET) ? env.BKASH_APP_SECRET!.trim() : '';
  const bkashUser = isConfiguredValue(env.BKASH_USERNAME) ? env.BKASH_USERNAME!.trim() : '';
  const bkashPass = isConfiguredValue(env.BKASH_PASSWORD) ? env.BKASH_PASSWORD!.trim() : '';
  const bkashEnabled = Boolean(bkashKey && bkashSecret && bkashUser && bkashPass);

  const nagadId = isConfiguredValue(env.NAGAD_MERCHANT_ID) ? env.NAGAD_MERCHANT_ID!.trim() : '';
  const nagadPub = isConfiguredValue(env.NAGAD_PUBLIC_KEY) ? env.NAGAD_PUBLIC_KEY!.trim() : '';
  const nagadPriv = isConfiguredValue(env.NAGAD_PRIVATE_KEY) ? env.NAGAD_PRIVATE_KEY!.trim() : '';
  const nagadEnabled = Boolean(nagadId && nagadPub && nagadPriv);

  return {
    nodeEnv,
    port,
    appUrl,
    chatServicePort,
    chatServiceUrl,
    chatCorsOrigins,
    jwtSecret,
    jwtExpiresIn: env.JWT_EXPIRES_IN || '7d',
    jwtUsingEphemeralDevSecret,
    dbClient,
    allowSqliteFallback,
    mysql: {
      host: mysqlHost || 'localhost',
      port: Number.isNaN(mysqlPort) ? 3306 : mysqlPort,
      user: mysqlUser || 'root',
      password: mysqlPassword,
      database: mysqlDatabase || 'rentshare_bd',
    },
    integrations: {
      gemini: {
        enabled: Boolean(geminiKey),
        apiKey: geminiKey,
      },
      cloudinary: {
        enabled: cloudinaryEnabled,
        cloudName,
        apiKey: cloudKey,
        apiSecret: cloudSecret,
      },
      paymentGateways: {
        sslcommerz: {
          enabled: sslEnabled,
          sandbox: env.SSLCOMMERZ_IS_SANDBOX !== 'false',
          storeId: sslStoreId,
          storePassword: sslStorePass,
        },
        bkash: {
          enabled: bkashEnabled,
          sandbox: env.BKASH_IS_SANDBOX !== 'false',
          appKey: bkashKey,
          appSecret: bkashSecret,
          username: bkashUser,
          password: bkashPass,
        },
        nagad: {
          enabled: nagadEnabled,
          sandbox: env.NAGAD_IS_SANDBOX !== 'false',
          merchantId: nagadId,
          publicKey: nagadPub,
          privateKey: nagadPriv,
        },
      },
    },
  };
}

let activeConfig: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (!activeConfig) {
    activeConfig = parseAppConfig(process.env);
  }
  return activeConfig;
}

export function resetAppConfigCache(): void {
  activeConfig = null;
}

export function getPublicIntegrationStatus(cfg: AppConfig = getAppConfig()) {
  return {
    chatServiceUrl: process.env.VITE_CHAT_SERVICE_URL || '',
    cloudinaryEnabled: cfg.integrations.cloudinary.enabled,
    imageStorageMode: cfg.integrations.cloudinary.enabled ? 'cloudinary' : 'local_fallback',
    geminiEnabled: cfg.integrations.gemini.enabled,
    paymentGateways: {
      sslcommerzConfigured: cfg.integrations.paymentGateways.sslcommerz.enabled,
      bkashConfigured: cfg.integrations.paymentGateways.bkash.enabled,
      nagadConfigured: cfg.integrations.paymentGateways.nagad.enabled,
      sslcommerz: {
        enabled: cfg.integrations.paymentGateways.sslcommerz.enabled,
        sandbox: cfg.integrations.paymentGateways.sslcommerz.sandbox,
      },
      bkash: {
        enabled: cfg.integrations.paymentGateways.bkash.enabled,
        sandbox: cfg.integrations.paymentGateways.bkash.sandbox,
      },
      nagad: {
        enabled: cfg.integrations.paymentGateways.nagad.enabled,
        sandbox: cfg.integrations.paymentGateways.nagad.sandbox,
      },
    },
  };
}

export function logStartupConfigSummary(cfg: AppConfig = getAppConfig()): void {
  if (cfg.jwtUsingEphemeralDevSecret) {
    console.warn(
      '[Config] JWT_SECRET is not set in environment; generated an ephemeral in-memory dev secret for this preview session. Set JWT_SECRET in .env for persistent local/production sessions.'
    );
  }
  console.log(
    `[Config] Optional Integrations -> Cloudinary: ${
      cfg.integrations.cloudinary.enabled ? 'Enabled' : 'Disabled (using local /uploads fallback)'
    } | Gemini AI: ${
      cfg.integrations.gemini.enabled ? 'Enabled' : 'Disabled (using statistical DB fallback)'
    } | SSLCommerz: ${
      cfg.integrations.paymentGateways.sslcommerz.enabled ? 'Enabled' : 'Disabled'
    } | bKash: ${
      cfg.integrations.paymentGateways.bkash.enabled ? 'Enabled' : 'Disabled'
    } | Nagad: ${
      cfg.integrations.paymentGateways.nagad.enabled ? 'Enabled' : 'Disabled'
    }`
  );
}
