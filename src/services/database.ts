import { vector } from '@electric-sql/pglite/vector';
import { PGlite } from '@electric-sql/pglite';
import type { StarredRepo, SearchResult } from '../types';

interface DBRow {
  id: number;
  full_name: string;
  description: string | null;
  html_url: string;
  stars: number;
  topics: string[];
  readme: string;
  similarity_score?: number;
}

export class DatabaseService {
  private db!: PGlite;

  public async initialize(): Promise<void> {
    console.log('Initializing database');

    this.db = new PGlite('idb://my-pgdata', {
      extensions: { vector },
    });

    await this.db.exec(`CREATE EXTENSION IF NOT EXISTS vector;`);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS repositories (
        id INTEGER PRIMARY KEY,
        full_name TEXT NOT NULL,
        description TEXT,
        html_url TEXT NOT NULL,
        stars INTEGER DEFAULT 0,
        topics TEXT[],
        readme TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        repo_id INTEGER PRIMARY KEY REFERENCES repositories(id),
        embedding vector(3072)
      )
    `);
  }

  public async storeRepositories(repos: StarredRepo[]): Promise<void> {
    await this.db.query('BEGIN');

    try {
      for (const repo of repos) {
        await this.db.query(
          `INSERT INTO repositories (id, full_name, description, html_url, stars, topics, readme)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             description = EXCLUDED.description,
             html_url = EXCLUDED.html_url,
             stars = EXCLUDED.stars,
             topics = EXCLUDED.topics,
             readme = EXCLUDED.readme`,
          [
            repo.id,
            repo.fullName,
            repo.description,
            repo.htmlUrl,
            repo.stars,
            repo.topics || [],
            repo.readme,
          ]
        );

        if (repo.embedding) {
          await this.db.query(
            `INSERT INTO embeddings (repo_id, embedding)
             VALUES ($1, $2::vector)
             ON CONFLICT (repo_id) DO UPDATE SET
             embedding = EXCLUDED.embedding`,
            [repo.id, `[${repo.embedding.toString()}]`]
          );
        }
      }

      await this.db.query('COMMIT');
    } catch (error) {
      console.error('Error storing repositories:', error);
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  public async searchRepositories(
    queryEmbedding: number[],
    limit = 10
  ): Promise<SearchResult[]> {
    const { rows } = await this.db.query<DBRow>(
      `SELECT 
        r.*,
        1 - (e.embedding <=> $1::vector) as similarity_score
       FROM repositories r
       JOIN embeddings e ON r.id = e.repo_id
       ORDER BY similarity_score DESC
       LIMIT $2`,
      [`[${queryEmbedding.toString()}]`, limit]
    );

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((row) => ({
      repo: {
        id: row.id,
        fullName: row.full_name,
        description: row.description,
        htmlUrl: row.html_url,
        stars: row.stars,
        topics: row.topics || [],
        readme: row.readme,
      },
      score: row.similarity_score || 0,
    }));
  }

  public async query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: unknown[] }> {
    return this.db.query(sql, params);
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
  }
}
