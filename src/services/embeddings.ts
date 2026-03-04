const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

export class EmbeddingEngine {
  private pipe: any = null;
  private loading = false;

  async init(onProgress?: (progress: number) => void): Promise<void> {
    if (this.pipe) return;
    if (this.loading) {
      // Wait for in-flight init
      while (this.loading) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return;
    }

    this.loading = true;
    try {
      // Dynamic import to avoid loading sharp/onnx at startup
      const { pipeline, env } = await import("@xenova/transformers");
      env.allowLocalModels = false;

      this.pipe = await pipeline("feature-extraction", MODEL_NAME, {
        progress_callback: (data: any) => {
          if (data.status === "progress" && onProgress) {
            onProgress(data.progress ?? 0);
          }
        },
      });
    } finally {
      this.loading = false;
    }
  }

  async embed(text: string): Promise<Float32Array> {
    if (!this.pipe) await this.init();
    const output = await this.pipe!(text, { pooling: "mean", normalize: true });
    return new Float32Array(output.data);
  }

  async embedBatch(
    texts: string[],
    batchSize = 32
  ): Promise<Float32Array[]> {
    if (!this.pipe) await this.init();

    const results: Float32Array[] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const outputs = await this.pipe!(batch, {
        pooling: "mean",
        normalize: true,
      });

      // outputs.data is a flat Float32Array of all embeddings concatenated
      const dims = 384;
      for (let j = 0; j < batch.length; j++) {
        const start = j * dims;
        results.push(new Float32Array(outputs.data.slice(start, start + dims)));
      }
    }
    return results;
  }

  isReady(): boolean {
    return this.pipe !== null;
  }
}

// Singleton
let instance: EmbeddingEngine | null = null;
export function getEmbeddingEngine(): EmbeddingEngine {
  if (!instance) {
    instance = new EmbeddingEngine();
  }
  return instance;
}
