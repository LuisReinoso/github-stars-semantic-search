import type { AppConfig } from '../types';

export class ConfigManager {
  private config: AppConfig;

  constructor(defaultConfig: AppConfig) {
    this.config = defaultConfig;
    this.loadConfig();
  }

  private validateConfig(
    config: Partial<AppConfig>,
    currentConfig: AppConfig
  ): AppConfig {
    const validated: AppConfig = { ...currentConfig };

    if (typeof config.batchSize === 'number' && !isNaN(config.batchSize)) {
      validated.batchSize = Math.min(Math.max(config.batchSize, 1), 50);
    }

    if (typeof config.maxRetries === 'number' && !isNaN(config.maxRetries)) {
      validated.maxRetries = Math.min(Math.max(config.maxRetries, 1), 10);
    }

    if (typeof config.perPage === 'number' && !isNaN(config.perPage)) {
      validated.perPage = Math.min(Math.max(config.perPage, 1), 100);
    }

    return validated;
  }

  private loadConfig(): void {
    try {
      const storedConfig = localStorage.getItem('appConfig');

      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);

        // Ensure all required fields are present and valid
        if (
          typeof parsedConfig === 'object' &&
          parsedConfig !== null &&
          Object.keys(parsedConfig).length > 0
        ) {
          this.config = this.validateConfig(parsedConfig, this.config);
        } else {
          console.warn('Invalid stored config format, using defaults');
        }
      } else {
        console.log('No stored config found, using defaults');
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  public updateConfig(newConfig: Partial<AppConfig>): void {
    this.config = this.validateConfig(newConfig, this.config);
    try {
      localStorage.setItem('appConfig', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving config to localStorage:', error);
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }
}
