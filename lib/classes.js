import { ObjectId } from "mongodb";

export function buildClassQuery(id) {
  if (ObjectId.isValid(id)) {
    return { _id: new ObjectId(id) };
  }
  return { id };
}

export function normalizeText(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function normalizePositiveInt(value, fallback = 30) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export function slugify(value, fallback = "class") {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return slug || fallback;
}

export function generateJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function mapMongoDocument(document) {
  return {
    ...document,
    _id: String(document._id),
  };
}
