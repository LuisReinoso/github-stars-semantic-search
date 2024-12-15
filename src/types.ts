export interface StarredRepo {
  id: number;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  stars: number;
  topics: string[];
  readme: string;
  embedding?: number[];
}

export interface SearchResult {
  repo: StarredRepo;
  score: number;
}

export interface ProgressInfo {
  type: 'readme';
  current: number;
  total: number;
  currentRepo: string;
}

export interface AppConfig {
  batchSize: number;
  maxRetries: number;
  perPage: number;
}

export const DEFAULT_CONFIG: AppConfig = {
  batchSize: 5,
  maxRetries: 5,
  perPage: 30,
};
