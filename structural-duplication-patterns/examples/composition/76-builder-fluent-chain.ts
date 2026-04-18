// Pattern 76: Builder-Fluent-Chain
// Fluent builders that return `this` for method chaining

// Variant A: User Builder
interface User {
  name: string;
  email: string;
  age: number;
}

function createUserBuilder() {
  const user: Partial<User> = {};
  return {
    withName(name: string) {
      user.name = name;
      return this;
    },
    withEmail(email: string) {
      user.email = email;
      return this;
    },
    withAge(age: number) {
      user.age = age;
      return this;
    },
    build(): User {
      return user as User;
    },
  };
}

// Variant B: Config Builder
interface ServerConfig {
  host: string;
  port: number;
  timeout: number;
}

function createConfigBuilder() {
  const config: Partial<ServerConfig> = {};
  return {
    withHost(host: string) {
      config.host = host;
      return this;
    },
    withPort(port: number) {
      config.port = port;
      return this;
    },
    withTimeout(timeout: number) {
      config.timeout = timeout;
      return this;
    },
    build(): ServerConfig {
      return config as ServerConfig;
    },
  };
}

// Variant C: Query Builder
interface QueryParams {
  table: string;
  columns: string[];
  limit: number;
}

function createQueryBuilder() {
  const query: Partial<QueryParams> = { columns: [] };
  return {
    from(table: string) {
      query.table = table;
      return this;
    },
    select(...columns: string[]) {
      query.columns = columns;
      return this;
    },
    take(limit: number) {
      query.limit = limit;
      return this;
    },
    build(): QueryParams {
      return query as QueryParams;
    },
  };
}

export { createUserBuilder, createConfigBuilder, createQueryBuilder };
