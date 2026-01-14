import { pipeline, FeatureExtractionPipeline } from '@huggingface/transformers';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

export class EmbeddingsService {
  private extractor: FeatureExtractionPipeline | null = null;

  async initialize(): Promise<void> {
    console.log(`Loading embedding model: ${MODEL_NAME}...`);
    this.extractor = await pipeline('feature-extraction', MODEL_NAME);
    console.log('Embedding model loaded.');
  }

  async embed(text: string): Promise<number[]> {
    if (!this.extractor) {
      throw new Error('EmbeddingsService not initialized. Call initialize() first.');
    }

    const truncatedText = text.slice(0, 8000);

    const output = await this.extractor(truncatedText, {
      pooling: 'mean',
      normalize: true,
    });

    return Array.from(output.data as Float32Array);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }
}
