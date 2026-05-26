const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024;

function toHex(buffer: ArrayBuffer): string {
  return `0x${Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

export async function hashFile(
  file: File,
  onProgress?: (progress: number) => void,
  chunkSize = DEFAULT_CHUNK_SIZE
): Promise<string> {
  if (file.size === 0) {
    onProgress?.(100);
    return toHex(await crypto.subtle.digest("SHA-256", new Uint8Array()));
  }

  const chunks: Uint8Array[] = [];
  let offset = 0;

  while (offset < file.size) {
    const nextOffset = Math.min(offset + chunkSize, file.size);
    const chunk = await file.slice(offset, nextOffset).arrayBuffer();
    chunks.push(new Uint8Array(chunk));
    offset = nextOffset;
    onProgress?.(Math.round((offset / file.size) * 100));
  }

  const combined = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
  let cursor = 0;
  for (const chunk of chunks) {
    combined.set(chunk, cursor);
    cursor += chunk.length;
  }

  return toHex(await crypto.subtle.digest("SHA-256", combined));
}
