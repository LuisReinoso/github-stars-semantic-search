import type { StarredRepo, SearchResult } from '../types';
import { GitHubService } from './github';
import { OpenAIService } from './openai';
import { DatabaseService } from './database';
import { ConfigManager } from './config-manager';
import { UIManager } from './ui-manager';

interface QueryResult {
  rows: Array<{ count: number }>;
}

export class RepositoryManager {
  private githubService: GitHubService;
  private openaiService: OpenAIService;
  private databaseService: DatabaseService;
  private configManager: ConfigManager;
  private uiManager: UIManager;

  constructor(
    githubService: GitHubService,
    openaiService: OpenAIService,
    databaseService: DatabaseService,
    configManager: ConfigManager,
    uiManager: UIManager
  ) {
    this.githubService = githubService;
    this.openaiService = openaiService;
    this.databaseService = databaseService;
    this.configManager = configManager;
    this.uiManager = uiManager;
  }

  public async initialize(): Promise<void> {
    const totalStars = await this.githubService.getTotalStarredCount();
    this.uiManager.setTotalStars(totalStars);

    const config = this.configManager.getConfig();
    this.configManager.updateConfig({
      ...config,
      perPage: config.perPage || 5, // Set default if not initialized
    });

    const { rows } = (await this.databaseService.query(
      'SELECT COUNT(*) as count FROM repositories'
    )) as QueryResult;

    const count = Number(rows[0].count);
    this.uiManager.setProcessedStars(count);
    await this.uiManager.updateRepositoryCountDisplay(count);
  }

  public async indexRepositories(page = 1): Promise<void> {
    try {
      // If it's the first page, check if we already have repositories
      if (page === 1) {
        const { rows } = (await this.databaseService.query(
          'SELECT COUNT(*) as count FROM repositories'
        )) as QueryResult;

        const count = Number(rows[0].count);

        if (count > 0) {
          await this.checkForMoreStars();
          this.uiManager.showSection('search-section');
          return;
        }
      }

      const progress = this.uiManager.createProgressElements();
      const config = this.configManager.getConfig();

      // Get repositories with progress tracking
      const repos = await this.githubService.getStarredRepos(
        async (progressInfo) => {
          if (progressInfo.type === 'readme') {
            const currentCount = await this.getCurrentCount();
            const currentTotal = currentCount + progressInfo.current;
            progress.updateProgress(
              currentTotal,
              await this.githubService.getTotalStarredCount(),
              'Downloading READMEs',
              progressInfo.currentRepo,
              `Processing ${progressInfo.current} of ${progressInfo.total} in current page`
            );
          }
        },
        page,
        config.perPage
      );

      // Generate embeddings in batches with progress tracking
      const reposWithEmbeddings: StarredRepo[] = [];
      let embeddingProgress = 0;

      for (let i = 0; i < repos.length; i += config.batchSize) {
        const batch = repos.slice(i, i + config.batchSize);

        // Update progress before starting the batch
        const currentBatch = Math.floor(i / config.batchSize) + 1;
        const totalBatches = Math.ceil(repos.length / config.batchSize);
        const currentCount = await this.getCurrentCount();

        progress.updateProgress(
          currentCount + embeddingProgress,
          await this.githubService.getTotalStarredCount(),
          'Generating Embeddings',
          batch[0].fullName,
          `Processing batch ${currentBatch} of ${totalBatches} in current page`
        );

        const batchWithEmbeddings = await this.openaiService.generateEmbeddings(
          batch
        );

        // Store batch immediately
        await this.databaseService.storeRepositories(batchWithEmbeddings);

        reposWithEmbeddings.push(...batchWithEmbeddings);
        embeddingProgress += batch.length;

        // Update progress after the batch is complete
        const newCount = await this.getCurrentCount();

        progress.updateProgress(
          newCount,
          await this.githubService.getTotalStarredCount(),
          'Generating Embeddings',
          batch[0].fullName,
          `Completed batch ${currentBatch} of ${totalBatches} in current page`
        );

        await this.uiManager.updateRepositoryCountDisplay(newCount);
      }

      // Check if there are more repositories to fetch
      await this.checkForMoreStars();
      this.uiManager.showSection('search-section');
    } catch (error) {
      console.error('Indexing error:', error);
      throw error;
    }
  }

  private async getCurrentCount(): Promise<number> {
    const { rows } = (await this.databaseService.query(
      'SELECT COUNT(*) as count FROM repositories'
    )) as QueryResult;
    return Number(rows[0].count);
  }

  public async checkForMoreStars(): Promise<void> {
    const currentCount = await this.getCurrentCount();

    this.uiManager.setupFetchMoreButton((nextPage) => {
      this.indexRepositories(nextPage);
    }, currentCount);

    await this.uiManager.updateRepositoryCountDisplay(currentCount);
  }

  public async reindex(): Promise<void> {
    // Clear existing data
    await this.databaseService.query('DELETE FROM embeddings');
    await this.databaseService.query('DELETE FROM repositories');

    // Reset counters and start reindexing
    this.uiManager.setProcessedStars(0);
    this.uiManager.showSection('indexing-section');
    await this.indexRepositories();
  }

  public async search(query: string): Promise<SearchResult[]> {
    const queryEmbedding = await this.openaiService.generateSearchEmbedding(
      query
    );
    return await this.databaseService.searchRepositories(queryEmbedding);
  }
}
