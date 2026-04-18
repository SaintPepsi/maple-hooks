// Pattern 42: Omit-Properties
// Shape: Copy object excluding certain properties

// === Types ===

interface UserWithSecrets {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  apiKey: string;
  createdAt: Date;
}

interface PaymentInfo {
  paymentId: string;
  amount: number;
  currency: string;
  cardNumber: string;
  cvv: string;
  expiryDate: string;
  billingAddress: string;
}

interface ConfigWithInternals {
  appName: string;
  version: string;
  environment: string;
  secretKey: string;
  databaseUrl: string;
  cacheHost: string;
  debugMode: boolean;
}

// === Variant A: Omit user secrets ===

type SafeUser = Omit<UserWithSecrets, 'passwordHash' | 'apiKey'>;

function omitUserSecrets(user: UserWithSecrets): SafeUser {
  const result = { ...user };
  const keysToOmit: Array<'passwordHash' | 'apiKey'> = ['passwordHash', 'apiKey'];
  for (const key of keysToOmit) {
    delete (result as Record<string, unknown>)[key];
  }
  return result as SafeUser;
}

function omitUserPassword(
  user: UserWithSecrets
): Omit<UserWithSecrets, 'passwordHash'> {
  const result = { ...user };
  delete (result as Record<string, unknown>)['passwordHash'];
  return result as Omit<UserWithSecrets, 'passwordHash'>;
}

// === Variant B: Omit payment sensitive data ===

type SafePaymentInfo = Omit<PaymentInfo, 'cardNumber' | 'cvv'>;

function omitPaymentSecrets(payment: PaymentInfo): SafePaymentInfo {
  const result = { ...payment };
  const keysToOmit: Array<'cardNumber' | 'cvv'> = ['cardNumber', 'cvv'];
  for (const key of keysToOmit) {
    delete (result as Record<string, unknown>)[key];
  }
  return result as SafePaymentInfo;
}

function omitPaymentCvv(payment: PaymentInfo): Omit<PaymentInfo, 'cvv'> {
  const result = { ...payment };
  delete (result as Record<string, unknown>)['cvv'];
  return result as Omit<PaymentInfo, 'cvv'>;
}

// === Variant C: Omit config internals ===

type PublicConfig = Omit<ConfigWithInternals, 'secretKey' | 'databaseUrl'>;

function omitConfigSecrets(config: ConfigWithInternals): PublicConfig {
  const result = { ...config };
  const keysToOmit: Array<'secretKey' | 'databaseUrl'> = ['secretKey', 'databaseUrl'];
  for (const key of keysToOmit) {
    delete (result as Record<string, unknown>)[key];
  }
  return result as PublicConfig;
}

function omitDebugFields(
  config: ConfigWithInternals
): Omit<ConfigWithInternals, 'debugMode'> {
  const result = { ...config };
  delete (result as Record<string, unknown>)['debugMode'];
  return result as Omit<ConfigWithInternals, 'debugMode'>;
}

// === Generic omit utility ===

function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete (result as Record<string, unknown>)[key as string];
  }
  return result as Omit<T, K>;
}

// === Omit using filter during copy ===

function omitByFilter<T extends object>(
  obj: T,
  keysToOmit: Set<string>
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (!keysToOmit.has(key as string)) {
      result[key] = obj[key];
    }
  }
  return result;
}

// === Exports ===

export {
  omitUserSecrets,
  omitUserPassword,
  omitPaymentSecrets,
  omitPaymentCvv,
  omitConfigSecrets,
  omitDebugFields,
  omit,
  omitByFilter,
};

export type {
  UserWithSecrets,
  SafeUser,
  PaymentInfo,
  SafePaymentInfo,
  ConfigWithInternals,
  PublicConfig,
};
