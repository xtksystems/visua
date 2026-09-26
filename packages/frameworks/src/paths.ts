import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Repository root (…/visua). */
export const REPO_ROOT = resolve(here, "../../..");
/** Local official documentation corpus. */
export const CORPUS_DIR = resolve(REPO_ROOT, "corpus");
/** Generated, normalized framework data. */
export const DATA_DIR = resolve(here, "../data");
