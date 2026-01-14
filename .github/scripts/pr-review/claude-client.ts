import Anthropic from '@anthropic-ai/sdk';
import { MCPContext, ReviewResult, PRData, Document } from './types';
import { InMemoryVectorStore } from './rag-store';

const SYSTEM_PROMPT = `You are an expert code reviewer for an Angular 21 project.
The project uses:
- Angular 21 with standalone components and signals
- @huggingface/transformers for ML
- Vitest for testing
- TypeScript 5.9

Review the provided code changes and provide constructive feedback.

IMPORTANT: You must respond with a valid JSON object in this exact format:
{
  "summary": "Brief summary of the changes and overall assessment",
  "issues": [
    {
      "severity": "critical|warning|info",
      "file": "filename.ts",
      "line": 42,
      "message": "Description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "suggestions": ["General suggestion 1", "General suggestion 2"],
  "approved": true|false
}

Focus on:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Security concerns
5. Angular-specific patterns (signals, standalone components, new control flow @if/@for)

Be specific and actionable. Reference file names and line numbers when possible.`;

export class ClaudeClient {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async getReview(prData: PRData, ragStore: InMemoryVectorStore): Promise<ReviewResult> {
    const context = await this.buildMCPContext(prData, ragStore);
    const userContent = this.formatContextForClaude(context, prData);

    console.log('Sending request to Claude API...');

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return this.parseReviewResponse(textContent.text);
  }

  private async buildMCPContext(
    prData: PRData,
    ragStore: InMemoryVectorStore
  ): Promise<MCPContext> {
    const relevantDocs = await ragStore.search(
      `${prData.title} ${prData.body} code review angular typescript`,
      10
    );

    const resources = [
      {
        uri: `pr://${prData.number}/metadata`,
        name: 'PR Metadata',
        mimeType: 'application/json',
        content: JSON.stringify({
          title: prData.title,
          body: prData.body,
          baseRef: prData.baseRef,
          headRef: prData.headRef,
        }),
      },
      ...prData.changedFiles.map((file) => ({
        uri: `file://${file.filename}`,
        name: file.filename,
        mimeType: this.getMimeType(file.filename),
        content: file.patch || file.content || '',
      })),
      ...relevantDocs.map((doc) => ({
        uri: `context://${doc.id}`,
        name: `Context: ${doc.metadata.filename}`,
        mimeType: 'text/plain',
        content: doc.content,
      })),
    ];

    return { resources };
  }

  private formatContextForClaude(context: MCPContext, prData: PRData): string {
    let content = '## Code Review Request\n\n';

    content += '### PR Information\n';
    content += `**Title:** ${prData.title}\n`;
    content += `**Description:** ${prData.body || 'No description'}\n`;
    content += `**Branch:** ${prData.headRef} -> ${prData.baseRef}\n\n`;

    content += '### Changed Files\n';
    for (const file of prData.changedFiles) {
      content += `\n#### ${file.filename}\n`;
      content += `Status: ${file.status} (+${file.additions}/-${file.deletions})\n`;

      if (file.patch) {
        content += '```diff\n' + this.truncate(file.patch, 3000) + '\n```\n';
      } else if (file.content) {
        const lang = this.getLanguageFromFilename(file.filename);
        content += '```' + lang + '\n' + this.truncate(file.content, 3000) + '\n```\n';
      }
    }

    const contextDocs = context.resources.filter((r) => r.uri.startsWith('context://'));
    if (contextDocs.length > 0) {
      content += '\n### Relevant Context from Codebase (RAG)\n';
      for (const doc of contextDocs.slice(0, 5)) {
        content += `\n#### ${doc.name}\n`;
        content += '```\n' + this.truncate(doc.content, 1000) + '\n```\n';
      }
    }

    content += '\nPlease provide a detailed code review in JSON format.';

    return content;
  }

  private parseReviewResponse(text: string): ReviewResult {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || 'No summary provided',
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        approved: Boolean(parsed.approved),
      };
    } catch (error) {
      console.error('Failed to parse Claude response:', error);
      return {
        summary: text.slice(0, 500),
        issues: [],
        suggestions: [],
        approved: true,
      };
    }
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      ts: 'text/typescript',
      js: 'text/javascript',
      json: 'application/json',
      html: 'text/html',
      css: 'text/css',
      md: 'text/markdown',
    };
    return mimeTypes[ext || ''] || 'text/plain';
  }

  private getLanguageFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languages: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      json: 'json',
      html: 'html',
      css: 'css',
      md: 'markdown',
      yaml: 'yaml',
      yml: 'yaml',
    };
    return languages[ext || ''] || '';
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '\n... (truncated)';
  }
}
