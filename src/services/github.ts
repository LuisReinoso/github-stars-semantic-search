import { Octokit } from '@octokit/rest';
import type { StarredRepo } from '../types';

export interface FetchProgress {
  type: 'readme';
  currentRepo: string;
  current: number;
  total: number;
}

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  private base64Decode(str: string): string {
    return decodeURIComponent(
      atob(str)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
  }

  public async validateToken(): Promise<boolean> {
    try {
      await this.octokit.users.getAuthenticated();
      return true;
    } catch {
      return false;
    }
  }

  public async getTotalStarredCount(): Promise<number> {
    const response =
      await this.octokit.activity.listReposStarredByAuthenticatedUser({
        per_page: 1,
      });

    // The response header contains the total count in the `total` property
    const totalCount = response.headers.link
      ? parseInt(
          response.headers.link.match(/page=(\d+)>; rel="last"/)?.[1] || '0'
        )
      : response.data.length;

    return totalCount;
  }

  public async getStarredRepos(
    onProgress?: (progress: FetchProgress) => void,
    page = 1,
    perPage = 30
  ): Promise<StarredRepo[]> {
    const repos: StarredRepo[] = [];

    const response =
      await this.octokit.activity.listReposStarredByAuthenticatedUser({
        per_page: perPage,
        page: page,
        sort: 'created',
        direction: 'asc',
      });

    const total = response.data.length;

    for (let i = 0; i < response.data.length; i++) {
      const repo = response.data[i];

      // Notify progress before starting each repo
      onProgress?.({
        type: 'readme',
        currentRepo: repo.full_name,
        current: i + 1,
        total,
      });

      const readmeResponse = await this.octokit.repos
        .getReadme({
          owner: repo.owner.login,
          repo: repo.name,
        })
        .catch(() => null);

      const readme = readmeResponse
        ? this.base64Decode(readmeResponse.data.content)
        : '';

      repos.push({
        id: repo.id,
        fullName: repo.full_name,
        description: repo.description,
        htmlUrl: repo.html_url,
        stars: repo.stargazers_count,
        topics: repo.topics || [],
        readme,
      });
    }

    return repos;
  }
}
