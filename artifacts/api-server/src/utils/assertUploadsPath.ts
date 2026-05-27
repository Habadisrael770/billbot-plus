import path from "path";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

/**
 * Canonicalise `filePath` and verify it is strictly inside the uploads
 * directory.  Both relative paths and absolute paths with traversal
 * components (e.g. /uploads/../etc/passwd) are handled safely because
 * path.resolve() eliminates all ".." segments before the containment
 * check is performed.
 *
 * Uses path.relative() for the containment test instead of startsWith()
 * so that directory-prefix collisions (e.g. "/uploads-extra/…") are
 * impossible.
 *
 * @param filePath  Raw path to validate.
 * @returns         The canonicalised absolute path within uploads/.
 * @throws          Error with code "PATH_OUTSIDE_UPLOADS" if the path
 *                  escapes the uploads directory.
 */
export function assertUploadsPath(filePath: string): string {
  const canonical = path.resolve(filePath);
  const rel = path.relative(UPLOADS_DIR, canonical);

  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    const err = new Error("File path must be within the uploads directory");
    (err as NodeJS.ErrnoException).code = "PATH_OUTSIDE_UPLOADS";
    throw err;
  }

  return canonical;
}
