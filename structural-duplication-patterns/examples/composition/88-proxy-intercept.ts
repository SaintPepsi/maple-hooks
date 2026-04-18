// Pattern 88: Proxy-Intercept
// Proxy pattern intercepting access to objects

// Variant A: Access Control Proxy
interface Document {
  read(): string;
  write(content: string): void;
}

function createAccessControlProxy(
  doc: Document,
  canWrite: () => boolean
): Document {
  return {
    read() {
      return doc.read();
    },
    write(content: string) {
      if (!canWrite()) {
        throw new Error("Write access denied");
      }
      doc.write(content);
    },
  };
}

// Variant B: Lazy Loading Proxy
interface DataSource {
  getData(): Record<string, unknown>;
}

function createLazyProxy(loader: () => DataSource): DataSource {
  let instance: DataSource | null = null;

  return {
    getData() {
      if (!instance) {
        instance = loader();
      }
      return instance.getData();
    },
  };
}

// Variant C: Metrics Proxy (using Result pattern instead of try-catch)
interface Service {
  execute(command: string): Promise<unknown>;
}

interface Metrics {
  calls: number;
  totalTime: number;
  errors: number;
}

type MetricsResult =
  | { ok: true; value: unknown }
  | { ok: false; error: Error };

function createMetricsProxy(service: Service, metrics: Metrics) {
  return {
    async executeWithMetrics(command: string): Promise<MetricsResult> {
      metrics.calls++;
      const start = Date.now();
      const result = await service.execute(command).then(
        (value) => ({ ok: true as const, value }),
        (error) => {
          metrics.errors++;
          return { ok: false as const, error: error as Error };
        }
      );
      metrics.totalTime += Date.now() - start;
      return result;
    },
  };
}

// Variant D: Virtual Proxy with ES Proxy
function createVirtualProxy<T extends object>(target: T): T {
  const accessed = new Set<string | symbol>();

  return new Proxy(target, {
    get(obj, prop) {
      accessed.add(prop);
      console.log(`Accessed property: ${String(prop)}`);
      return Reflect.get(obj, prop);
    },
    set(obj, prop, value) {
      console.log(`Setting property: ${String(prop)}`);
      return Reflect.set(obj, prop, value);
    },
  });
}

export {
  createAccessControlProxy,
  createLazyProxy,
  createMetricsProxy,
  createVirtualProxy,
};
