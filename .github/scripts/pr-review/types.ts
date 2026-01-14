export interface PRData {
  number: number;
  title: string;
  body: string;
  diff: string;
  changedFiles: ChangedFile[];
  baseRef: string;
  headRef: string;
}

export interface ChangedFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;
  content?: string;
}

export interface Document {
  id: string;
  content: string;
  metadata: {
    filename: string;
    lineStart?: number;
    lineEnd?: number;
    type: 'code' | 'diff' | 'context';
  };
  embedding?: number[];
}

export interface ReviewResult {
  summary: string;
  issues: ReviewIssue[];
  suggestions: string[];
  approved: boolean;
}

export interface ReviewIssue {
  severity: 'critical' | 'warning' | 'info';
  file?: string;
  line?: number;
  message: string;
  suggestion?: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType: string;
  content: string;
}

export interface MCPContext {
  resources: MCPResource[];
}

export interface Config {
  githubToken: string;
  anthropicApiKey: string;
  prNumber: number;
  repoOwner: string;
  repoName: string;
}
