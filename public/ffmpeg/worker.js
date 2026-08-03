/* =========================================================
 * 客户端视频压缩专用 ffmpeg worker（classic worker）
 * 独立于 @ffmpeg/ffmpeg，避免 Next.js webpack 打包冲突。
 * 协议：{ id, type, data } → { id, type:'ok'|'error', data }
 * ========================================================= */
let ffmpeg = null;

async function loadCore(coreURL, wasmURL) {
  const mod = await import(coreURL); // ESM 构建（有 default export）
  const createFFmpegCore = mod && mod.default;
  if (typeof createFFmpegCore !== 'function') {
    throw new Error('ffmpeg core module has no default export');
  }
  ffmpeg = await createFFmpegCore({
    // 让 Emscripten 的 locateFile 通过 hash 拿到 wasmURL
    mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL }))}`,
    locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmURL : prefix + path),
  });
  ffmpeg.setProgress(({ progress }) => {
    self.postMessage({ type: 'progress', data: { progress } });
  });
}

self.onmessage = async (e) => {
  const { id, type, data } = e.data || {};
  try {
    let result;
    switch (type) {
      case 'load':
        await loadCore(data.coreURL, data.wasmURL);
        break;
      case 'writeFile':
        ffmpeg.FS.writeFile(data.path, new Uint8Array(data.data));
        break;
      case 'exec':
        ffmpeg.exec(...data.args);
        result = ffmpeg.ret;
        ffmpeg.reset();
        break;
      case 'readFile':
        result = ffmpeg.FS.readFile(data.path);
        break;
      case 'deleteFile':
        try {
          ffmpeg.FS.unlink(data.path);
        } catch {
          /* 忽略不存在的文件 */
        }
        break;
      default:
        throw new Error('unknown message type: ' + type);
    }
    self.postMessage({ id, type: 'ok', data: result });
  } catch (err) {
    self.postMessage({ id, type: 'error', data: String((err && err.message) || err) });
  }
};
