import { install } from '@twind/core';
import config from '../twind.config';

// Initialize Twind immediately before any content is rendered
install(config);

// Remove loading state as soon as Twind is initialized
document.body.removeAttribute('data-loading');

// Import dependencies
import { GitHubService } from './services/github';
import { OpenAIService } from './services/openai';
import { DatabaseService } from './services/database';
import { ConfigManager } from './services/config-manager';
import { UIManager } from './services/ui-manager';
import { RepositoryManager } from './services/repository-manager';
import { DEFAULT_CONFIG, SearchResult } from './types';
import { NotificationService } from './services/notification';

// Wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - initializing app');
  new App();
});

class App {
  private configManager: ConfigManager;
  private uiManager: UIManager;
  private repositoryManager: RepositoryManager | null = null;
  private isInitialized = false;
  private notificationService: NotificationService;

  constructor() {
    this.configManager = new ConfigManager(DEFAULT_CONFIG);
    this.uiManager = new UIManager(this.configManager);
    this.notificationService = NotificationService.getInstance();
    this.initializeEventListeners();
    this.loadStoredTokens();
  }

  private initializeEventListeners() {
    const authButton = document.getElementById('auth-button');
    const searchButton = document.getElementById('search-button');
    const reindexButton = document.getElementById('reindex-button');
    const searchInput = document.getElementById(
      'search-input'
    ) as HTMLInputElement;
    const perPageInput = document.getElementById(
      'auth-per-page'
    ) as HTMLInputElement;

    if (perPageInput) {
      const config = this.configManager.getConfig();
      perPageInput.value = config.perPage.toString();
    }

    authButton?.addEventListener('click', () => this.handleAuthentication());
    searchButton?.addEventListener('click', () => this.handleSearch());
    reindexButton?.addEventListener('click', () => this.handleReindex());
    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSearch();
      }
    });

    // Setup configuration modal
    this.uiManager.setupConfigModal();
  }

  private loadStoredTokens() {
    const githubToken = localStorage.getItem('githubToken');
    const openaiKey = localStorage.getItem('openaiKey');
    const tokenInput = document.getElementById(
      'github-token'
    ) as HTMLInputElement;
    const openaiInput = document.getElementById(
      'openai-key'
    ) as HTMLInputElement;

    if (githubToken) {
      tokenInput.value = githubToken;
    }
    if (openaiKey) {
      openaiInput.value = openaiKey;
    }

    if (githubToken && openaiKey) {
      this.handleAuthentication();
    }
  }

  private async handleAuthentication() {
    const tokenInput = document.getElementById(
      'github-token'
    ) as HTMLInputElement;
    const openaiInput = document.getElementById(
      'openai-key'
    ) as HTMLInputElement;
    const perPageInput = document.getElementById(
      'auth-per-page'
    ) as HTMLInputElement;
    const githubTokenError = document.getElementById('github-token-error');
    const openaiKeyError = document.getElementById('openai-key-error');
    const perPageError = document.getElementById('per-page-error');

    // Clear previous error messages
    if (githubTokenError) {
      githubTokenError.textContent = '';
      tokenInput.classList.remove('border-red-500');
    }
    if (openaiKeyError) {
      openaiKeyError.textContent = '';
      openaiInput.classList.remove('border-red-500');
    }
    if (perPageError) {
      perPageError.textContent = '';
      perPageInput.classList.remove('border-red-500');
    }

    const token = tokenInput.value.trim();
    const openaiKey = openaiInput.value.trim();
    const perPage = parseInt(perPageInput.value);

    const showError = (
      element: HTMLElement | null,
      input: HTMLInputElement,
      message: string
    ) => {
      if (element) {
        element.textContent = message;
        input.classList.add('border-red-500');
      }
    };

    if (!token) {
      showError(githubTokenError, tokenInput, 'GitHub token is required');
      return;
    }

    if (!openaiKey) {
      showError(openaiKeyError, openaiInput, 'OpenAI API key is required');
      return;
    }

    if (!perPageInput.value.trim()) {
      showError(
        perPageError,
        perPageInput,
        'Repositories per page is required'
      );
      return;
    }

    if (!perPage || isNaN(perPage) || perPage < 1 || perPage > 100) {
      showError(
        perPageError,
        perPageInput,
        'Please enter a number between 1 and 100'
      );
      return;
    }

    try {
      const databaseService = new DatabaseService();
      await databaseService.initialize();
      const githubService = new GitHubService(token);
      const isValid = await githubService.validateToken();

      if (!isValid) {
        showError(githubTokenError, tokenInput, 'Invalid GitHub token');
        return;
      }

      try {
        const openaiService = new OpenAIService(openaiKey);
        await openaiService.generateSearchEmbedding('test');
      } catch (error) {
        showError(openaiKeyError, openaiInput, 'Invalid OpenAI API key');
        return;
      }

      // Store tokens only after validation
      localStorage.setItem('githubToken', token);
      localStorage.setItem('openaiKey', openaiKey);

      const openaiService = new OpenAIService(openaiKey);

      // Set perPage in config
      this.configManager.updateConfig({ perPage });

      // Initialize repository manager
      this.repositoryManager = new RepositoryManager(
        githubService,
        openaiService,
        databaseService,
        this.configManager,
        this.uiManager
      );

      await this.repositoryManager.initialize();
      this.isInitialized = true;

      this.uiManager.showSection('indexing-section');
      await this.repositoryManager.indexRepositories();
      this.notificationService.show('success', 'Successfully authenticated');
    } catch (error) {
      console.error('Authentication error:', error);
      // Log detailed error information
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      this.notificationService.show(
        'error',
        'An error occurred during authentication. Check console for details.'
      );
    }
  }

  private async handleSearch() {
    if (!this.isInitialized || !this.repositoryManager) {
      this.notificationService.show('warning', 'Please authenticate first');
      return;
    }

    const searchInput = document.getElementById(
      'search-input'
    ) as HTMLInputElement;
    const query = searchInput.value.trim();

    if (!query) {
      this.notificationService.show('warning', 'Please enter a search query');
      return;
    }

    try {
      const results = await this.repositoryManager.search(query);
      this.displayResults(results);
      if (results.length === 0) {
        this.notificationService.show(
          'info',
          'No results found for your search'
        );
      } else {
        this.notificationService.show(
          'success',
          `Found ${results.length} results`
        );
      }
    } catch (error) {
      console.error('Search error:', error);
      this.notificationService.show(
        'error',
        'An error occurred while searching'
      );
    }
  }

  private async handleReindex() {
    if (!this.isInitialized || !this.repositoryManager) {
      this.notificationService.show('warning', 'Please authenticate first');
      return;
    }

    const currentConfig = this.configManager.getConfig();
    const { confirmed, perPage } =
      await this.notificationService.confirmWithPerPage(currentConfig.perPage);

    if (!confirmed) {
      return;
    }

    // Ensure we have a valid perPage value
    if (!perPage || perPage < 1 || perPage > 100) {
      this.notificationService.show(
        'error',
        'Please enter a valid number between 1 and 100'
      );
      return;
    }

    try {
      this.configManager.updateConfig({ perPage });

      const perPageInput = document.getElementById(
        'auth-per-page'
      ) as HTMLInputElement;
      if (perPageInput) {
        perPageInput.value = perPage.toString();
      }

      // Clear the database and start fresh
      const databaseService = new DatabaseService();
      await databaseService.initialize();
      await databaseService.query('DELETE FROM embeddings');
      await databaseService.query('DELETE FROM repositories');

      // Re-create repository manager with new configuration
      const githubToken = localStorage.getItem('githubToken');
      const openaiKey = localStorage.getItem('openaiKey');

      if (!githubToken || !openaiKey) {
        throw new Error('Authentication tokens not found');
      }

      const githubService = new GitHubService(githubToken);
      const openaiService = new OpenAIService(openaiKey);

      this.repositoryManager = new RepositoryManager(
        githubService,
        openaiService,
        databaseService,
        this.configManager,
        this.uiManager
      );

      await this.repositoryManager.initialize();
      this.notificationService.show('info', 'Starting reindexing process...');
      this.uiManager.showSection('indexing-section');
      await this.repositoryManager.indexRepositories();
      this.notificationService.show(
        'success',
        'Successfully reindexed all repositories'
      );
    } catch (error) {
      console.error('Reindex error:', error);
      this.notificationService.show(
        'error',
        'An error occurred while reindexing repositories'
      );
    }
  }

  private displayResults(results: SearchResult[]) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';

    if (results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="p-4 text-center text-gray-500">
          No results found
        </div>
      `;
      return;
    }

    const formatStarCount = (count: number): string => {
      if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
      }
      if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`;
      }
      return count.toString();
    };

    results.forEach((result) => {
      const resultElement = document.createElement('div');
      resultElement.className =
        'bg-white rounded-xl shadow-sm border border-secondary-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 hover:border-primary-200';

      resultElement.innerHTML = `
        <div class="flex flex-col">
          <div class="flex-1">
            <div class="flex items-start justify-between">
              <a href="${result.repo.htmlUrl}" 
                 target="_blank" 
                 class="text-lg sm:text-xl font-semibold text-secondary-900 hover:text-primary-600 transition-colors break-words">
                ${result.repo.fullName}
              </a>
              <div class="flex items-center ml-2 sm:ml-4 shrink-0">
                <span class="flex items-center text-amber-500">
                  <svg class="w-3.5 h-3.5 mr-1 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  <span class="font-medium">${formatStarCount(
                    result.repo.stars
                  )}</span>
                </span>
              </div>
            </div>
            <p class="mt-2 text-sm sm:text-base text-secondary-600">
              ${result.repo.description || 'No description available'}
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-2 sm:gap-4">
              <span class="text-secondary-700 text-sm sm:text-base bg-secondary-50 px-2.5 py-1 rounded-lg border border-secondary-200">
                Score: ${Math.round(result.score * 100)}%
              </span>
              ${
                result.repo.topics && result.repo.topics.length > 0
                  ? `
                <div class="flex flex-wrap gap-1.5 sm:gap-2">
                  ${result.repo.topics
                    .map(
                      (topic) => `
                    <span class="px-2.5 py-1 text-xs bg-primary-50 text-primary-700 rounded-full border border-primary-200 font-medium">
                      ${topic}
                    </span>
                  `
                    )
                    .join('')}
                </div>
              `
                  : ''
              }
            </div>
          </div>
        </div>
      `;

      resultsContainer.appendChild(resultElement);
    });
  }
}
