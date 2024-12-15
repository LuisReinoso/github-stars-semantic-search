import OpenAI from 'openai';
import type { StarredRepo } from '../types';

export class OpenAIService {
  private openai: OpenAI;
  private readonly MODEL = 'text-embedding-3-large';
  private readonly MAX_TOKENS = 6000; // Reduced to be more conservative
  private readonly CHARS_PER_TOKEN = 4; // Approximate chars per token

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }

  private truncateText(text: string): string {
    const maxChars = this.MAX_TOKENS * this.CHARS_PER_TOKEN;

    if (text.length <= maxChars) {
      return text;
    }

    // For very long texts, be even more conservative with the split
    const firstPartRatio = text.length > maxChars * 2 ? 0.4 : 0.6;

    // Take first part of the text (usually more important)
    const firstPart = text.slice(0, Math.floor(maxChars * firstPartRatio));

    // Take last part of the text (might contain conclusions/summaries)
    const remainingChars = maxChars - firstPart.length - 20; // 20 chars for separator
    const lastPart = text.slice(text.length - Math.floor(remainingChars));

    return `${firstPart}\n[...content truncated...]\n${lastPart}`;
  }

  private prepareRepoText(repo: StarredRepo): string {
    // Prioritize the most important information
    const metadata = [
      `Repository: ${repo.fullName}`,
      repo.description ? `Description: ${repo.description}` : '',
      repo.topics?.length ? `Topics: ${repo.topics.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    // Calculate remaining space for README
    const metadataLength = metadata.length;
    const maxTotalChars = this.MAX_TOKENS * this.CHARS_PER_TOKEN;
    const remainingChars = maxTotalChars - metadataLength - 100; // Buffer for formatting

    let readmeContent = repo.readme || 'No README available';

    if (readmeContent.length > remainingChars) {
      const firstPart = readmeContent.slice(
        0,
        Math.floor(remainingChars * 0.6)
      );
      const lastPart = readmeContent.slice(
        readmeContent.length - Math.floor(remainingChars * 0.4)
      );
      readmeContent = `${firstPart}\n[...README truncated...]\n${lastPart}`;
    }

    return this.truncateText(`${metadata}\n\nREADME:\n${readmeContent}`);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const truncatedText = this.truncateText(text);
    try {
      const response = await this.openai.embeddings.create({
        model: this.MODEL,
        input: truncatedText,
      });
      return response.data[0].embedding;
    } catch (error: any) {
      if (
        'message' in error &&
        error.message?.includes('maximum context length')
      ) {
        // If still too long, try with an even shorter text
        const shorterText = this.truncateText(
          truncatedText.slice(0, truncatedText.length * 0.75)
        );
        const response = await this.openai.embeddings.create({
          model: this.MODEL,
          input: shorterText,
        });
        return response.data[0].embedding;
      }
      throw error;
    }
  }

  async generateSearchEmbedding(query: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: this.MODEL,
      input: query,
    });

    return response.data[0].embedding;
  }

  async generateEmbeddings(repos: StarredRepo[]): Promise<StarredRepo[]> {
    const reposWithEmbeddings: StarredRepo[] = [];

    for (const repo of repos) {
      try {
        const text = this.prepareRepoText(repo);
        const embedding = await this.generateEmbedding(text);
        reposWithEmbeddings.push({
          ...repo,
          embedding,
        });
      } catch (error) {
        console.error(
          `Error generating embedding for ${repo.fullName}:`,
          error
        );
        // Continue with next repo instead of failing completely
        continue;
      }
    }

    return reposWithEmbeddings;
  }
}
