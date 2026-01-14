import { Octokit } from '@octokit/rest';
import { Config, PRData, ChangedFile } from './types';

export class GitHubClient {
  private octokit: Octokit;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.octokit = new Octokit({ auth: config.githubToken });
  }

  async fetchPRData(): Promise<PRData> {
    const { repoOwner, repoName, prNumber } = this.config;

    const [prResponse, filesResponse] = await Promise.all([
      this.octokit.pulls.get({
        owner: repoOwner,
        repo: repoName,
        pull_number: prNumber,
      }),
      this.octokit.pulls.listFiles({
        owner: repoOwner,
        repo: repoName,
        pull_number: prNumber,
        per_page: 100,
      }),
    ]);

    const pr = prResponse.data;
    const files = filesResponse.data;

    const changedFiles: ChangedFile[] = await Promise.all(
      files.slice(0, 15).map(async (file) => {
        let content: string | undefined;

        if (file.status !== 'removed' && this.isTextFile(file.filename)) {
          try {
            const contentResponse = await this.octokit.repos.getContent({
              owner: repoOwner,
              repo: repoName,
              path: file.filename,
              ref: pr.head.sha,
            });

            if ('content' in contentResponse.data) {
              content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8');
            }
          } catch {
            // File might be too large or binary
          }
        }

        return {
          filename: file.filename,
          status: file.status as ChangedFile['status'],
          additions: file.additions,
          deletions: file.deletions,
          patch: file.patch,
          content,
        };
      })
    );

    // Get full diff
    const diffResponse = await this.octokit.pulls.get({
      owner: repoOwner,
      repo: repoName,
      pull_number: prNumber,
      mediaType: { format: 'diff' },
    });

    return {
      number: pr.number,
      title: pr.title,
      body: pr.body || '',
      diff: diffResponse.data as unknown as string,
      changedFiles,
      baseRef: pr.base.ref,
      headRef: pr.head.ref,
    };
  }

  async postComment(body: string): Promise<void> {
    const { repoOwner, repoName, prNumber } = this.config;

    await this.octokit.issues.createComment({
      owner: repoOwner,
      repo: repoName,
      issue_number: prNumber,
      body,
    });
  }

  private isTextFile(filename: string): boolean {
    const textExtensions = [
      '.ts', '.js', '.tsx', '.jsx', '.json', '.html', '.css', '.scss',
      '.md', '.yaml', '.yml', '.xml', '.txt', '.sh', '.py', '.go',
      '.rs', '.java', '.kt', '.swift', '.c', '.cpp', '.h', '.hpp',
    ];
    return textExtensions.some((ext) => filename.endsWith(ext));
  }
}
