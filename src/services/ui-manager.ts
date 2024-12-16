import type { AppConfig } from '../types';
import { ConfigManager } from './config-manager';

export class UIManager {
  private configManager: ConfigManager;
  private totalStars = 0;
  private _processedStars = 0;
  private currentRepoText: HTMLParagraphElement | null = null;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  public setTotalStars(total: number): void {
    this.totalStars = total;
  }

  private updateProcessedStarsCount(processed: number): void {
    this._processedStars = processed;
    this.updateDisplays();
  }

  private updateDisplays(): void {
    const fetchMoreContainer = document.getElementById('fetch-more-container');
    if (fetchMoreContainer) {
      const countText = fetchMoreContainer.querySelector('p');
      if (countText) {
        countText.textContent = `${this._processedStars} of ${this.totalStars} repositories indexed`;
      }
    }

    const searchSection = document.getElementById('search-section');
    if (searchSection) {
      let statusElement = searchSection.querySelector('.repo-status');
      if (!statusElement) {
        statusElement = document.createElement('p');
        statusElement.className = 'repo-status text-sm text-gray-600 mt-2';
        const searchHeader = searchSection.querySelector('h2');
        if (searchHeader) {
          searchHeader.parentNode?.insertBefore(
            statusElement,
            searchHeader.nextSibling
          );
        }
      }
      statusElement.textContent = `${this._processedStars} of ${this.totalStars} repositories indexed`;
    }
  }

  public setProcessedStars(processed: number): void {
    this.updateProcessedStarsCount(processed);
  }

  public showSection(sectionId: string): void {
    const sections = ['auth-section', 'indexing-section', 'search-section'];

    // First, hide all sections
    sections.forEach((id) => {
      const section = document.getElementById(id);
      if (section) {
        if (id === sectionId) {
          console.log(`Making ${id} visible`);
          section.style.display = 'block';
          section.classList.remove('hidden');
        } else {
          console.log(`Hiding ${id}`);
          section.style.display = 'none';
          section.classList.add('hidden');
        }
      } else {
        console.warn(`Section ${id} not found`);
      }
    });
  }

  public async updateRepositoryCountDisplay(
    currentCount: number
  ): Promise<void> {
    this.updateProcessedStarsCount(currentCount);
  }

  public createProgressElements(): {
    updateProgress: (
      current: number,
      total: number,
      phase: string,
      repo: string,
      batchInfo?: string
    ) => void;
  } {
    const progressBar = document.getElementById(
      'indexing-progress'
    ) as HTMLProgressElement;
    const progressText = document.getElementById('progress-text');

    // Remove any existing current repo text and embedding progress
    if (this.currentRepoText) {
      this.currentRepoText.remove();
    }
    const existingEmbeddingProgress = document.getElementById(
      'embedding-progress-text'
    );
    if (existingEmbeddingProgress) {
      existingEmbeddingProgress.remove();
    }

    // Create new current repo text
    this.currentRepoText = document.createElement('p');
    this.currentRepoText.className = 'text-sm text-gray-600 text-center mt-2';
    progressText?.parentNode?.insertBefore(
      this.currentRepoText,
      progressText?.nextSibling || null
    );

    // Create embedding progress element
    const embeddingProgressText = document.createElement('p');
    embeddingProgressText.id = 'embedding-progress-text';
    embeddingProgressText.className = 'text-sm text-gray-500 text-center mt-1';
    this.currentRepoText.parentNode?.insertBefore(
      embeddingProgressText,
      this.currentRepoText.nextSibling
    );

    return {
      updateProgress: (
        current: number,
        total: number,
        phase: string,
        repo: string,
        batchInfo?: string
      ) => {
        const percentage = Math.round((current / total) * 100);
        if (progressBar) {
          progressBar.style.width = `${percentage}%`;
        }
        if (progressText) {
          let message = `${percentage}% - ${phase}`;
          if (batchInfo) {
            message += ` (${batchInfo})`;
          }
          progressText.textContent = message;
        }
        if (this.currentRepoText) {
          this.currentRepoText.textContent = `Processing: ${repo} (${current} of ${total} total repositories)`;
        }

        // Update embedding progress
        const embeddingProgress = document.getElementById(
          'embedding-progress-text'
        );
        if (embeddingProgress) {
          if (phase === 'Generating Embeddings') {
            embeddingProgress.innerHTML = `
              <span class="inline-flex items-center">
                Generating embeddings for repository content...
                <svg class="w-3.5 h-3.5 ml-2 animate-spin text-primary shrink-0" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            `;
          } else {
            embeddingProgress.textContent = '';
          }
        }
      },
    };
  }

  public setupConfigModal(): void {
    const configButton = document.getElementById('config-button');
    const configModal = document.getElementById('config-modal');
    const configModalContent = document.getElementById('config-modal-content');
    const closeConfigModal = document.getElementById('close-config-modal');
    const saveConfigButton = document.getElementById('save-config');
    const batchSizeInput = document.getElementById(
      'batch-size'
    ) as HTMLInputElement;
    const maxRetriesInput = document.getElementById(
      'max-retries'
    ) as HTMLInputElement;

    if (configButton && configModal && configModalContent) {
      // Open modal
      configButton.addEventListener('click', () => {
        const currentConfig = this.configManager.getConfig();
        if (batchSizeInput)
          batchSizeInput.value = currentConfig.batchSize.toString();
        if (maxRetriesInput)
          maxRetriesInput.value = currentConfig.maxRetries.toString();
        configModal.classList.remove('hidden');
        configModal.style.display = 'flex';
      });

      // Close modal when clicking outside
      configModal.addEventListener('click', (e) => {
        if (e.target === configModal) {
          configModal.classList.add('hidden');
          configModal.style.display = 'none';
        }
      });

      configModalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    if (closeConfigModal && configModal) {
      closeConfigModal.addEventListener('click', () => {
        configModal.classList.add('hidden');
        configModal.style.display = 'none';
      });
    }

    if (saveConfigButton && configModal) {
      saveConfigButton.addEventListener('click', () => {
        const newConfig: Partial<AppConfig> = {};

        if (batchSizeInput) {
          const batchSize = parseInt(batchSizeInput.value);
          if (!isNaN(batchSize)) {
            newConfig.batchSize = batchSize;
          }
        }

        if (maxRetriesInput) {
          const maxRetries = parseInt(maxRetriesInput.value);
          if (!isNaN(maxRetries)) {
            newConfig.maxRetries = maxRetries;
          }
        }

        this.configManager.updateConfig(newConfig);
        configModal.classList.add('hidden');
        configModal.style.display = 'none';
      });
    }
  }

  public setupFetchMoreButton(
    onFetchMore: (nextPage: number) => void,
    currentCount: number
  ): void {
    const fetchMoreContainer = document.getElementById('fetch-more-container');
    const searchSection = document.getElementById('search-section');

    if (fetchMoreContainer) {
      fetchMoreContainer.remove();
    }

    if (this.totalStars > currentCount && searchSection) {
      const container = document.createElement('div');
      container.id = 'fetch-more-container';
      container.className = 'mt-4 text-center border-t border-gray-200 pt-4';

      container.innerHTML = `
        <p class="text-sm text-gray-600 mb-2">
          ${currentCount} of ${this.totalStars} repositories indexed
        </p>
        <button
          id="fetch-more-button"
          class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap font-medium"
        >
          Fetch More Repositories
        </button>
      `;

      searchSection.appendChild(container);

      const button = container.querySelector('#fetch-more-button');
      if (button) {
        button.addEventListener('click', () => {
          const config = this.configManager.getConfig();
          const nextPage = Math.ceil(currentCount / config.perPage) + 1;
          this.showSection('indexing-section');
          onFetchMore(nextPage);
        });
      }
    }
  }
}
