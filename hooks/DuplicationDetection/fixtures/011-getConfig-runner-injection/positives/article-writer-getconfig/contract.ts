declare function loadHookConfig<T extends object>(name: string, defaults: T, dir: string): T;

interface ArticleWriterConfig {
  repo: string;
}

const DEFAULT_CONFIG: ArticleWriterConfig = {
  repo: "",
};

const getConfig = (): ArticleWriterConfig =>
  loadHookConfig("articleWriter", DEFAULT_CONFIG, __dirname);

export { getConfig };
