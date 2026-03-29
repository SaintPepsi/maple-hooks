// Shared types for the pattern duplication detector spike.

export interface ClusterMember {
  file: string;
  functionName: string;
  line: number;
  evidence: string[];
}

export interface Cluster {
  id: string;
  detector: "import" | "structural" | "layered";
  label: string;
  confidence: number;
  members: ClusterMember[];
  reason: string;
}

export interface ParsedFunction {
  name: string;
  file: string;
  line: number;
  params: ParamInfo[];
  returnType: string | null;
  imports: string[]; // module specifiers imported in the same file
  bodyNodeTypes: string[]; // flattened list of AST node types in function body
  bodyHash: string; // hash of normalized AST structure
}

export interface ParamInfo {
  index: number;
  typeAnnotation: string | null;
}

export interface ParsedFile {
  path: string;
  functions: ParsedFunction[];
  imports: string[];
}
