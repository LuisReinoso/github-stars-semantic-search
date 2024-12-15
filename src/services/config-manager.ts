import type { AppConfig } from '../types';

export class ConfigManager {
  private config: AppConfig;

  constructor(defaultConfig: AppConfig) {
    this.config = defaultConfig;
    this.loadConfig();
  }

  private validateConfig(config: Partial<AppConfig>): Partial<AppConfig> {
    const validated: Partial<AppConfig> = {};

    if (typeof config.batchSize === 'number') {
      validated.batchSize = Math.min(Math.max(config.batchSize, 1), 50);
    }

    if (typeof config.maxRetries === 'number') {
      validated.maxRetries = Math.min(Math.max(config.maxRetries, 1), 10);
    }

    if (typeof config.perPage === 'number') {
      validated.perPage = Math.min(Math.max(config.perPage, 10), 100);
    }

    return validated;
  }

  private loadConfig(): void {
    const storedConfig = localStorage.getItem('appConfig');
    if (storedConfig) {
      try {
        const parsedConfig = JSON.parse(storedConfig);
        const validatedConfig = this.validateConfig(parsedConfig);
        this.updateConfig(validatedConfig);
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }
  }

  public updateConfig(newConfig: Partial<AppConfig>): void {
    const validatedConfig = this.validateConfig(newConfig);
    this.config = {
      ...this.config,
      ...validatedConfig,
    };
    localStorage.setItem('appConfig', JSON.stringify(this.config));
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }
}
