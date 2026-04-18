// Pattern 35: Unique-Deduplicate
// Shape: Collect unique values from collection

// === Types ===

interface Contact {
  id: string;
  email: string;
  name: string;
  source: string;
}

interface Tag {
  id: string;
  name: string;
  category: string;
}

interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  timestamp: number;
}

// === Variant A: Deduplicate contacts by email ===

function deduplicateContactsByEmail(contacts: Contact[]): Contact[] {
  const seen = new Set<string>();
  const result: Contact[] = [];
  for (const contact of contacts) {
    if (!seen.has(contact.email)) {
      seen.add(contact.email);
      result.push(contact);
    }
  }
  return result;
}

function getUniqueEmails(contacts: Contact[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const contact of contacts) {
    if (!seen.has(contact.email)) {
      seen.add(contact.email);
      result.push(contact.email);
    }
  }
  return result;
}

// === Variant B: Deduplicate tags by name ===

function deduplicateTagsByName(tags: Tag[]): Tag[] {
  const seen = new Set<string>();
  const result: Tag[] = [];
  for (const tag of tags) {
    if (!seen.has(tag.name)) {
      seen.add(tag.name);
      result.push(tag);
    }
  }
  return result;
}

function getUniqueCategories(tags: Tag[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    if (!seen.has(tag.category)) {
      seen.add(tag.category);
      result.push(tag.category);
    }
  }
  return result;
}

// === Variant C: Deduplicate notifications by user and type ===

function deduplicateNotifications(notifications: Notification[]): Notification[] {
  const seen = new Set<string>();
  const result: Notification[] = [];
  for (const notification of notifications) {
    const key = `${notification.userId}:${notification.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(notification);
    }
  }
  return result;
}

function getUniqueUserIds(notifications: Notification[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const notification of notifications) {
    if (!seen.has(notification.userId)) {
      seen.add(notification.userId);
      result.push(notification.userId);
    }
  }
  return result;
}

// === Generic uniqueBy utility ===

function uniqueBy<T, K>(items: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function unique<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

// === Exports ===

export {
  deduplicateContactsByEmail,
  getUniqueEmails,
  deduplicateTagsByName,
  getUniqueCategories,
  deduplicateNotifications,
  getUniqueUserIds,
  uniqueBy,
  unique,
};

export type { Contact, Tag, Notification };
