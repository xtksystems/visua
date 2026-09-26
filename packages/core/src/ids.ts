const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Short, URL-safe, time-sortable id: `<prefix>_<time36><random>`. Works in Node and browsers. */
export function newId(prefix: string): string {
  const time = Date.now().toString(36).padStart(9, "0");
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  let rand = "";
  for (const b of bytes) rand += ALPHABET[b % ALPHABET.length];
  return `${prefix}_${time}${rand}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
