import { ReviewResult, ReviewIssue } from './types';

export function formatReviewAsMarkdown(review: ReviewResult): string {
  let md = '## AI Code Review\n\n';

  md += '### Summary\n';
  md += review.summary + '\n\n';

  const statusEmoji = review.approved ? ':white_check_mark:' : ':warning:';
  const statusText = review.approved ? 'Approved' : 'Changes Requested';
  md += `**Status:** ${statusEmoji} ${statusText}\n\n`;

  if (review.issues.length > 0) {
    md += '### Issues Found\n\n';

    const critical = review.issues.filter((i) => i.severity === 'critical');
    const warnings = review.issues.filter((i) => i.severity === 'warning');
    const infos = review.issues.filter((i) => i.severity === 'info');

    if (critical.length > 0) {
      md += '#### :rotating_light: Critical\n';
      critical.forEach((issue) => {
        md += formatIssue(issue);
      });
      md += '\n';
    }

    if (warnings.length > 0) {
      md += '#### :warning: Warnings\n';
      warnings.forEach((issue) => {
        md += formatIssue(issue);
      });
      md += '\n';
    }

    if (infos.length > 0) {
      md += '#### :information_source: Suggestions\n';
      infos.forEach((issue) => {
        md += formatIssue(issue);
      });
      md += '\n';
    }
  }

  if (review.suggestions.length > 0) {
    md += '### General Suggestions\n';
    review.suggestions.forEach((s) => {
      md += `- ${s}\n`;
    });
    md += '\n';
  }

  md += '---\n';
  md += '*Powered by Claude AI with RAG-enhanced context*\n';

  return md;
}

function formatIssue(issue: ReviewIssue): string {
  let line = '- ';

  if (issue.file) {
    line += `**${issue.file}`;
    if (issue.line) {
      line += `:${issue.line}`;
    }
    line += '**: ';
  }

  line += issue.message;

  if (issue.suggestion) {
    line += `\n  - *Suggestion:* ${issue.suggestion}`;
  }

  return line + '\n';
}
