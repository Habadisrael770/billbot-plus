import { createHash } from "crypto";
import { createReadStream } from "fs";

/**
 * computeFileHash
 *
 * Computes the SHA-256 hash of a file at the given path.
 * Streams the file to avoid loading it entirely into memory.
 */
export function computeFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });
}
