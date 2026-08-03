/**
 * ffmpeg worker 的主线程客户端（classic worker，独立于 @ffmpeg/ffmpeg）。
 * 通过变量拼接 URL 创建 worker，避免 Next.js webpack 尝试打包该 worker。
 */

type Pending = {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
};

export class FFmpegClient {
  private worker: Worker;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private progressHandler: ((percent: number) => void) | null = null;

  constructor() {
    // 变量拼接，webpack 无法静态分析，因此不会被打包进 worker chunk
    const workerUrl = `${window.location.origin}/ffmpeg/worker.js`;
    this.worker = new Worker(workerUrl);
    this.worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg?.type === 'progress') {
        this.progressHandler?.(msg.data?.progress);
        return;
      }
      const p = this.pending.get(msg?.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.type === 'error') p.reject(new Error(msg.data));
      else p.resolve(msg.data);
    };
    this.worker.onerror = (e) => {
      this.pending.forEach((p) => p.reject(new Error(e.message || 'ffmpeg worker error')));
      this.pending.clear();
    };
  }

  onProgress(handler: ((percent: number) => void) | null) {
    this.progressHandler = handler;
  }

  private post(type: string, data?: unknown, transfer?: Transferable[]): Promise<unknown> {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, data }, transfer ?? []);
    });
  }

  load(coreURL: string, wasmURL: string): Promise<unknown> {
    return this.post('load', { coreURL, wasmURL });
  }

  writeFile(path: string, data: Uint8Array): Promise<unknown> {
    return this.post('writeFile', { path, data }, [data.buffer]);
  }

  exec(args: string[]): Promise<unknown> {
    return this.post('exec', { args });
  }

  async readFile(path: string): Promise<Uint8Array> {
    return (await this.post('readFile', { path })) as Uint8Array;
  }

  deleteFile(path: string): Promise<unknown> {
    return this.post('deleteFile', { path });
  }

  terminate() {
    this.worker.terminate();
  }
}
