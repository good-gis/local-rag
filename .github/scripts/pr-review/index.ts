import { GitHubClient } from './github-client';
import { EmbeddingsService } from './embeddings';
import { InMemoryVectorStore } from './rag-store';
import { ClaudeClient } from './claude-client';
import { formatReviewAsMarkdown } from './review-formatter';
import { Config, Document, ChangedFile } from './types';

function getConfig(): Config {
  const githubToken = process.env.GITHUB_TOKEN;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const prNumber = process.env.PR_NUMBER;
  const repoOwner = process.env.REPO_OWNER;
  const repoName = process.env.REPO_NAME;

  if (!githubToken) throw new Error('GITHUB_TOKEN is required');
  if (!anthropicApiKey) throw new Error('ANTHROPIC_API_KEY is required');
  if (!prNumber) throw new Error('PR_NUMBER is required');
  if (!repoOwner) throw new Error('REPO_OWNER is required');
  if (!repoName) throw new Error('REPO_NAME is required');

  return {
    githubToken,
    anthropicApiKey,
    prNumber: parseInt(prNumber, 10),
    repoOwner,
    repoName,
  };
}

function createDocumentsFromFiles(files: ChangedFile[]): Document[] {
  const documents: Document[] = [];

  for (const file of files) {
    if (file.content) {
      documents.push({
        id: `file:${file.filename}`,
        content: file.content,
        metadata: {
          filename: file.filename,
          type: 'code',
        },
      });
    }

    if (file.patch) {
      const hunks = file.patch.split(/(?=@@)/);
      hunks.forEach((hunk, idx) => {
        if (hunk.trim()) {
          documents.push({
            id: `diff:${file.filename}:${idx}`,
            content: hunk,
            metadata: {
              filename: file.filename,
              type: 'diff',
            },
          });
        }
      });
    }
  }

  return documents;
}

async function main(): Promise<void> {
  console.log('Starting AI Code Review...\n');

  const config = getConfig();
  console.log(`Reviewing PR #${config.prNumber} in ${config.repoOwner}/${config.repoName}\n`);

  const githubClient = new GitHubClient(config);

  console.log('Fetching PR data...');
  const prData = await githubClient.fetchPRData();
  console.log(`PR: "${prData.title}"`);
  console.log(`Changed files: ${prData.changedFiles.length}\n`);

  const embeddings = new EmbeddingsService();
  await embeddings.initialize();

  const ragStore = new InMemoryVectorStore(embeddings);

  const documents = createDocumentsFromFiles(prData.changedFiles);
  if (documents.length > 0) {
    await ragStore.addDocuments(documents);
  }

  const claudeClient = new ClaudeClient(config.anthropicApiKey);
  const review = await claudeClient.getReview(prData, ragStore);

  console.log('\nReview complete!');
  console.log(`Status: ${review.approved ? 'Approved' : 'Changes Requested'}`);
  console.log(`Issues found: ${review.issues.length}`);

  const markdown = formatReviewAsMarkdown(review);

  console.log('\nPosting review comment...');
  await githubClient.postComment(markdown);
  console.log('Review posted successfully!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
