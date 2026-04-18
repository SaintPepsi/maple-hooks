// Pattern 45: Transform-Entries
// Shape: Transform object via entries mapping

// === Types ===

interface PriceList {
  [productId: string]: number;
}

interface RawMetrics {
  [metricName: string]: number;
}

interface FormattedMetrics {
  [metricName: string]: string;
}

interface Translation {
  [key: string]: string;
}

interface LocalizedStrings {
  [key: string]: {
    text: string;
    locale: string;
  };
}

// === Variant A: Transform prices ===

function applyDiscount(prices: PriceList, discountPercent: number): PriceList {
  return Object.fromEntries(
    Object.entries(prices).map(([productId, price]) => [
      productId,
      price * (1 - discountPercent / 100),
    ])
  );
}

function convertCurrency(
  prices: PriceList,
  exchangeRate: number
): PriceList {
  return Object.fromEntries(
    Object.entries(prices).map(([productId, price]) => [
      productId,
      price * exchangeRate,
    ])
  );
}

function roundPrices(prices: PriceList, decimals = 2): PriceList {
  const factor = Math.pow(10, decimals);
  return Object.fromEntries(
    Object.entries(prices).map(([productId, price]) => [
      productId,
      Math.round(price * factor) / factor,
    ])
  );
}

// === Variant B: Transform metrics ===

function formatMetrics(metrics: RawMetrics, suffix = ''): FormattedMetrics {
  return Object.fromEntries(
    Object.entries(metrics).map(([name, value]) => [
      name,
      `${value.toFixed(2)}${suffix}`,
    ])
  );
}

function normalizeMetrics(metrics: RawMetrics): RawMetrics {
  const max = Math.max(...Object.values(metrics));
  if (max === 0) return { ...metrics };

  return Object.fromEntries(
    Object.entries(metrics).map(([name, value]) => [name, value / max])
  );
}

function prefixMetricNames(
  metrics: RawMetrics,
  prefix: string
): RawMetrics {
  return Object.fromEntries(
    Object.entries(metrics).map(([name, value]) => [`${prefix}${name}`, value])
  );
}

// === Variant C: Transform translations ===

function uppercaseTranslations(translations: Translation): Translation {
  return Object.fromEntries(
    Object.entries(translations).map(([key, text]) => [key, text.toUpperCase()])
  );
}

function localizeStrings(
  translations: Translation,
  locale: string
): LocalizedStrings {
  return Object.fromEntries(
    Object.entries(translations).map(([key, text]) => [
      key,
      { text, locale },
    ])
  );
}

function prefixTranslationKeys(
  translations: Translation,
  prefix: string
): Translation {
  return Object.fromEntries(
    Object.entries(translations).map(([key, text]) => [`${prefix}.${key}`, text])
  );
}

// === Generic transform utilities ===

function mapValues<T, U>(
  obj: Record<string, T>,
  fn: (value: T, key: string) => U
): Record<string, U> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, fn(value, key)])
  );
}

function mapKeys<T>(
  obj: Record<string, T>,
  fn: (key: string, value: T) => string
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [fn(key, value), value])
  );
}

function filterEntries<T>(
  obj: Record<string, T>,
  predicate: (key: string, value: T) => boolean
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key, value]) => predicate(key, value))
  );
}

function mapEntries<T, U>(
  obj: Record<string, T>,
  fn: (key: string, value: T) => [string, U]
): Record<string, U> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => fn(key, value))
  );
}

// === Exports ===

export {
  applyDiscount,
  convertCurrency,
  roundPrices,
  formatMetrics,
  normalizeMetrics,
  prefixMetricNames,
  uppercaseTranslations,
  localizeStrings,
  prefixTranslationKeys,
  mapValues,
  mapKeys,
  filterEntries,
  mapEntries,
};

export type {
  PriceList,
  RawMetrics,
  FormattedMetrics,
  Translation,
  LocalizedStrings,
};
