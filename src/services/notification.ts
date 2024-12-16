export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

export class NotificationService {
  private static instance: NotificationService;
  private container: HTMLDivElement | null = null;
  private notifications: Map<string, Notification> = new Map();
  private modalContainer: HTMLDivElement | null = null;

  private constructor() {
    this.createContainer();
    this.createModalContainer();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private createContainer() {
    this.container = document.createElement('div');
    this.container.className =
      'fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 min-w-[320px] max-w-[420px]';
    document.body.appendChild(this.container);
  }

  private createModalContainer() {
    this.modalContainer = document.createElement('div');
    this.modalContainer.className = 'fixed inset-0 z-[1000] hidden';
    document.body.appendChild(this.modalContainer);
  }

  public show(
    type: NotificationType,
    message: string,
    duration = 4000
  ): string {
    const id = Math.random().toString(36).substring(2);
    const notification: Notification = { id, type, message, duration };

    const element = document.createElement('div');
    element.setAttribute('data-notification-id', id);
    element.className = `
      w-full bg-white shadow-lg rounded-lg pointer-events-auto
      transform transition-all duration-300 ease-out
      translate-x-full opacity-0
      border-l-4 ${this.getBorderColor(type)}
    `;

    element.style.boxShadow =
      '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';

    element.innerHTML = `
      <div class="p-4">
        <div class="flex items-start">
          ${this.getTypeIcon(type)}
          <div class="ml-3 w-0 flex-1">
            <div class="flex items-start justify-between">
              <p class="text-sm font-medium ${this.getTextColor(type)}">
                ${this.getTitle(type)}
              </p>
              <button type="button" class="ml-4 flex-shrink-0 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded-full p-1 hover:bg-gray-100 transition-colors duration-200" data-close-button>
                <span class="sr-only">Close</span>
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
            <p class="mt-1 text-sm text-gray-600">
              ${message}
            </p>
          </div>
        </div>
      </div>
      ${duration > 0 ? this.createProgressBar(type) : ''}
    `;

    const closeButton = element.querySelector('[data-close-button]');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hide(id);
      });
    }

    this.container?.prepend(element);
    this.notifications.set(id, notification);

    // Trigger enter animation
    requestAnimationFrame(() => {
      element.classList.remove('translate-x-full', 'opacity-0');
    });

    if (duration > 0) {
      const progressBar = element.querySelector(
        '.progress-bar'
      ) as HTMLDivElement;
      if (progressBar) {
        progressBar.style.transition = `width ${duration}ms linear`;
        requestAnimationFrame(() => {
          progressBar.style.width = '0%';
        });
      }
      setTimeout(() => this.hide(id), duration);
    }

    return id;
  }

  public hide(id: string) {
    const notification = this.notifications.get(id);
    if (!notification || !this.container) return;

    const element = this.container.querySelector(
      `[data-notification-id="${id}"]`
    ) as HTMLDivElement;

    if (element) {
      element.classList.add('translate-x-full', 'opacity-0');

      setTimeout(() => {
        if (this.container?.contains(element)) {
          this.container.removeChild(element);
          this.notifications.delete(id);
        }
      }, 300);
    }
  }

  private getBorderColor(type: NotificationType): string {
    switch (type) {
      case 'success':
        return 'border-green-400';
      case 'error':
        return 'border-red-400';
      case 'warning':
        return 'border-amber-400';
      case 'info':
        return 'border-primary-400';
      default:
        return 'border-secondary-400';
    }
  }

  private getTextColor(type: NotificationType): string {
    switch (type) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'warning':
        return 'text-amber-700';
      case 'info':
        return 'text-primary-700';
      default:
        return 'text-secondary-700';
    }
  }

  private getTitle(type: NotificationType): string {
    switch (type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      default:
        return 'Notification';
    }
  }

  private createProgressBar(type: NotificationType): string {
    const bgColor =
      {
        success: 'bg-green-400',
        error: 'bg-red-400',
        warning: 'bg-amber-400',
        info: 'bg-primary-400',
      }[type] || 'bg-secondary-400';

    return `
      <div class="relative h-1 bg-secondary-100 rounded-b-lg overflow-hidden">
        <div class="progress-bar absolute top-0 left-0 w-full h-full ${bgColor} transition-all duration-300"></div>
      </div>
    `;
  }

  private getTypeIcon(type: NotificationType): string {
    const baseClass = 'flex-shrink-0 w-5 h-5';
    const color =
      {
        success: 'text-green-400',
        error: 'text-red-400',
        warning: 'text-amber-400',
        info: 'text-primary-400',
      }[type] || 'text-secondary-400';

    switch (type) {
      case 'success':
        return `<svg class="${baseClass} ${color}" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>`;
      case 'error':
        return `<svg class="${baseClass} ${color}" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>`;
      case 'warning':
        return `<svg class="${baseClass} ${color}" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>`;
      case 'info':
        return `<svg class="${baseClass} ${color}" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>`;
      default:
        return '';
    }
  }

  public async confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.modalContainer) return resolve(false);

      this.modalContainer.className =
        'fixed inset-0 z-[1000] flex items-center justify-center';
      this.modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-25 transition-opacity"></div>
        <div class="relative bg-white rounded-lg max-w-md w-full mx-4 overflow-hidden shadow-xl transform transition-all">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Confirmation Required</h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">${message}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
            <button type="button" class="confirm-yes w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm">
              Yes, continue
            </button>
            <button type="button" class="confirm-no mt-3 sm:mt-0 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:w-auto sm:text-sm">
              Cancel
            </button>
          </div>
        </div>
      `;

      const yesButton = this.modalContainer.querySelector('.confirm-yes');
      const noButton = this.modalContainer.querySelector('.confirm-no');
      const backdrop = this.modalContainer.querySelector(
        '.fixed.inset-0.bg-black'
      );

      const cleanup = () => {
        this.modalContainer!.className = 'fixed inset-0 z-[1000] hidden';
        this.modalContainer!.innerHTML = '';
      };

      yesButton?.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      noButton?.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      backdrop?.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });
    });
  }

  public async prompt(
    message: string,
    placeholder: string
  ): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this.modalContainer) return resolve(null);

      this.modalContainer.className =
        'fixed inset-0 z-[1000] flex items-center justify-center';
      this.modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm transition-opacity z-[1001]"></div>
        <div class="relative bg-white rounded-xl max-w-md w-full mx-4 overflow-hidden shadow-lg border border-secondary-200 z-[1002]">
          <div class="bg-white px-6 py-6">
            <div class="space-y-4">
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="ml-3 flex-1">
                  <h3 class="text-lg font-medium text-secondary-900">API Key Required</h3>
                  <p class="mt-1.5 text-sm text-secondary-600">${message}</p>
                  <div class="mt-4">
                    <input
                      type="password"
                      id="prompt-input"
                      placeholder="${placeholder}"
                      class="w-full px-3 py-2 border border-secondary-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
                    />
                  </div>
                </div>
              </div>
              <div class="flex justify-end gap-3">
                <button
                  type="button"
                  class="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 transition-colors font-medium"
                  id="prompt-cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium shadow-sm"
                  id="prompt-confirm"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      const input = this.modalContainer.querySelector(
        '#prompt-input'
      ) as HTMLInputElement;
      const confirmButton =
        this.modalContainer.querySelector('#prompt-confirm');
      const cancelButton = this.modalContainer.querySelector('#prompt-cancel');

      const cleanup = () => {
        this.modalContainer!.className = 'fixed inset-0 z-[1000] hidden';
        this.modalContainer!.innerHTML = '';
      };

      confirmButton?.addEventListener('click', () => {
        const value = input?.value || null;
        cleanup();
        resolve(value);
      });

      cancelButton?.addEventListener('click', () => {
        cleanup();
        resolve(null);
      });

      // Focus input
      setTimeout(() => input?.focus(), 100);

      // Handle Enter key
      input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const value = input.value || null;
          cleanup();
          resolve(value);
        }
      });
    });
  }

  public async confirmWithPerPage(
    currentPerPage: number
  ): Promise<{ confirmed: boolean; perPage: number | null }> {
    return new Promise((resolve) => {
      if (!this.modalContainer)
        return resolve({ confirmed: false, perPage: null });

      this.modalContainer.className =
        'fixed inset-0 z-[1000] flex items-center justify-center';
      this.modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm transition-opacity z-[1001]"></div>
        <div class="relative bg-white rounded-xl max-w-md w-full mx-4 overflow-hidden shadow-lg border border-secondary-200 z-[1002]">
          <div class="bg-white px-6 py-6">
            <div class="space-y-4">
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div class="ml-3 flex-1">
                  <h3 class="text-lg font-medium text-secondary-900">Confirmation Required</h3>
                  <div class="mt-3 space-y-4">
                    <div>
                      <label for="per-page" class="block text-sm font-medium text-secondary-700">
                        Repositories Per Page
                      </label>
                      <div class="mt-1">
                        <input
                          type="number"
                          id="per-page"
                          min="1"
                          max="100"
                          value="${currentPerPage}"
                          class="w-full px-3 py-2 border border-secondary-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
                        />
                      </div>
                      <p class="mt-1 text-sm text-amber-600">
                        <strong>Note:</strong> This setting affects GitHub API pagination (1-100). Choose carefully as it impacts how repositories are fetched.
                      </p>
                    </div>
                    <p class="text-sm text-secondary-600">
                      Are you sure you want to reindex all repositories? This will delete all existing data.
                    </p>
                  </div>
                </div>
              </div>
              <div class="mt-5 flex justify-end gap-3">
                <button
                  id="cancel-button"
                  class="px-4 py-2 text-sm font-medium text-secondary-700 hover:text-secondary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  id="confirm-button"
                  class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium shadow-sm"
                >
                  Yes, continue
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      const cancelButton = this.modalContainer.querySelector('#cancel-button');
      const confirmButton =
        this.modalContainer.querySelector('#confirm-button');
      const perPageInput = this.modalContainer.querySelector(
        '#per-page'
      ) as HTMLInputElement;

      const cleanup = () => {
        this.modalContainer!.className = 'fixed inset-0 z-[1000] hidden';
        this.modalContainer!.innerHTML = '';
      };

      cancelButton?.addEventListener('click', () => {
        cleanup();
        resolve({ confirmed: false, perPage: null });
      });

      confirmButton?.addEventListener('click', () => {
        const perPage = parseInt(perPageInput.value);
        if (isNaN(perPage) || perPage < 1 || perPage > 100) {
          this.show('error', 'Please enter a valid number between 1 and 100');
          return;
        }
        cleanup();
        resolve({ confirmed: true, perPage });
      });
    });
  }
}
