// Pattern 40: Index-Build
// Shape: Build lookup map from collection

// === Types ===

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface Product {
  sku: string;
  name: string;
  price: number;
  category: string;
}

interface Country {
  code: string;
  name: string;
  continent: string;
  population: number;
}

// === Variant A: Index users by ID ===

function indexUsersById(users: User[]): Map<string, User> {
  const index = new Map<string, User>();
  for (const user of users) {
    index.set(user.id, user);
  }
  return index;
}

function indexUsersByEmail(users: User[]): Map<string, User> {
  const index = new Map<string, User>();
  for (const user of users) {
    index.set(user.email, user);
  }
  return index;
}

function indexUsersByUsername(users: User[]): Map<string, User> {
  const index = new Map<string, User>();
  for (const user of users) {
    index.set(user.username, user);
  }
  return index;
}

// === Variant B: Index products by SKU ===

function indexProductsBySku(products: Product[]): Map<string, Product> {
  const index = new Map<string, Product>();
  for (const product of products) {
    index.set(product.sku, product);
  }
  return index;
}

function indexProductPricesBySku(products: Product[]): Map<string, number> {
  const index = new Map<string, number>();
  for (const product of products) {
    index.set(product.sku, product.price);
  }
  return index;
}

// === Variant C: Index countries by code (using object) ===

function indexCountriesByCode(countries: Country[]): Record<string, Country> {
  const index: Record<string, Country> = {};
  for (const country of countries) {
    index[country.code] = country;
  }
  return index;
}

function indexCountryNamesByCode(countries: Country[]): Record<string, string> {
  const index: Record<string, string> = {};
  for (const country of countries) {
    index[country.code] = country.name;
  }
  return index;
}

// === Generic indexBy utilities ===

function indexBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T> {
  const index = new Map<K, T>();
  for (const item of items) {
    index.set(keyFn(item), item);
  }
  return index;
}

function indexByToObject<T>(
  items: T[],
  keyFn: (item: T) => string
): Record<string, T> {
  const index: Record<string, T> = {};
  for (const item of items) {
    index[keyFn(item)] = item;
  }
  return index;
}

function indexByWithValue<T, K extends string | number, V>(
  items: T[],
  keyFn: (item: T) => K,
  valueFn: (item: T) => V
): Map<K, V> {
  const index = new Map<K, V>();
  for (const item of items) {
    index.set(keyFn(item), valueFn(item));
  }
  return index;
}

// === Exports ===

export {
  indexUsersById,
  indexUsersByEmail,
  indexUsersByUsername,
  indexProductsBySku,
  indexProductPricesBySku,
  indexCountriesByCode,
  indexCountryNamesByCode,
  indexBy,
  indexByToObject,
  indexByWithValue,
};

export type { User, Product, Country };
