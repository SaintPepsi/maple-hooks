// Pattern 87: Template-Method
// Template method pattern with customizable steps

// Variant A: Report Generator Template
interface ReportStep<T> {
  fetchData(): Promise<T>;
  processData(data: T): T;
  formatOutput(data: T): string;
}

function createReportGenerator<T>(steps: ReportStep<T>) {
  return {
    async generate(): Promise<string> {
      const raw = await steps.fetchData();
      const processed = steps.processData(raw);
      return steps.formatOutput(processed);
    },
  };
}

const salesReportSteps: ReportStep<{ sales: number[] }> = {
  async fetchData() {
    return { sales: [100, 200, 300] };
  },
  processData(data) {
    return { sales: data.sales.filter((s) => s > 150) };
  },
  formatOutput(data) {
    return `Sales: ${data.sales.join(", ")}`;
  },
};

// Variant B: Build Process Template
interface BuildSteps {
  clean(): void;
  compile(): void;
  test(): void;
  package(): void;
}

function createBuildProcess(steps: BuildSteps) {
  return {
    run() {
      steps.clean();
      steps.compile();
      steps.test();
      steps.package();
    },
  };
}

const webAppBuildSteps: BuildSteps = {
  clean() {
    console.log("Cleaning dist/");
  },
  compile() {
    console.log("Compiling TypeScript");
  },
  test() {
    console.log("Running Jest tests");
  },
  package() {
    console.log("Creating bundle");
  },
};

// Variant C: Data Import Template
interface ImportSteps<TRaw, TProcessed> {
  read(): Promise<TRaw[]>;
  validate(items: TRaw[]): TRaw[];
  transform(items: TRaw[]): TProcessed[];
  save(items: TProcessed[]): Promise<void>;
}

function createDataImporter<TRaw, TProcessed>(
  steps: ImportSteps<TRaw, TProcessed>
) {
  return {
    async import(): Promise<number> {
      const raw = await steps.read();
      const valid = steps.validate(raw);
      const transformed = steps.transform(valid);
      await steps.save(transformed);
      return transformed.length;
    },
  };
}

const csvUserImportSteps: ImportSteps<
  { name: string; email: string },
  { id: string; name: string; email: string }
> = {
  async read() {
    return [{ name: "Alice", email: "alice@test.com" }];
  },
  validate(items) {
    return items.filter((i) => i.email.includes("@"));
  },
  transform(items) {
    return items.map((i) => ({ ...i, id: crypto.randomUUID() }));
  },
  async save(items) {
    console.log(`Saved ${items.length} users`);
  },
};

export {
  createReportGenerator,
  createBuildProcess,
  createDataImporter,
  salesReportSteps,
  webAppBuildSteps,
  csvUserImportSteps,
};
