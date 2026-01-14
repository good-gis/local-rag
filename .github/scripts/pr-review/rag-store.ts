import { Document } from './types';
import { EmbeddingsService } from './embeddings';

export class InMemoryVectorStore {
  private documents: Document[] = [];
  private embeddings: EmbeddingsService;

  constructor(embeddings: EmbeddingsService) {
    this.embeddings = embeddings;
  }

  async addDocument(doc: Document): Promise<void> {
    doc.embedding = await this.embeddings.embed(doc.content);
    this.documents.push(doc);
  }

  async addDocuments(docs: Document[]): Promise<void> {
    console.log(`Indexing ${docs.length} documents...`);
    for (let i = 0; i < docs.length; i++) {
      await this.addDocument(docs[i]);
      if ((i + 1) % 10 === 0) {
        console.log(`Indexed ${i + 1}/${docs.length} documents`);
      }
    }
    console.log('Indexing complete.');
  }

  async search(query: string, topK: number = 5): Promise<Document[]> {
    if (this.documents.length === 0) {
      return [];
    }

    const queryEmbedding = await this.embeddings.embed(query);

    const scored = this.documents.map((doc) => ({
      doc,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding!),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.doc);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  getDocumentCount(): number {
    return this.documents.length;
  }
}
