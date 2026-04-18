// Pattern 92: Property-Exists-Guard
// Guard checking if a property exists before accessing it

interface BaseEntity {
  id: string;
}

interface WithTimestamps {
  createdAt: Date;
  updatedAt: Date;
}

interface WithMetadata {
  metadata: Record<string, unknown>;
}

interface WithTags {
  tags: string[];
}

// Variant A
function hasTimestamps<T extends BaseEntity>(
  entity: T
): entity is T & WithTimestamps {
  return (
    'createdAt' in entity &&
    'updatedAt' in entity &&
    entity.createdAt instanceof Date &&
    entity.updatedAt instanceof Date
  );
}

// Variant B
function hasMetadata<T extends BaseEntity>(
  entity: T
): entity is T & WithMetadata {
  return (
    'metadata' in entity &&
    typeof entity.metadata === 'object' &&
    entity.metadata !== null
  );
}

// Variant C
function hasTags<T extends BaseEntity>(entity: T): entity is T & WithTags {
  return 'tags' in entity && Array.isArray(entity.tags);
}

// Usage examples
interface Document extends BaseEntity {
  title: string;
  content: string;
}

function processDocument(doc: Document): void {
  console.log(`Document: ${doc.title}`);

  if (hasTimestamps(doc)) {
    console.log(`Created: ${doc.createdAt.toISOString()}`);
    console.log(`Updated: ${doc.updatedAt.toISOString()}`);
  }

  if (hasMetadata(doc)) {
    console.log(`Metadata keys: ${Object.keys(doc.metadata).join(', ')}`);
  }

  if (hasTags(doc)) {
    console.log(`Tags: ${doc.tags.join(', ')}`);
  }
}

export { hasTimestamps, hasMetadata, hasTags };
