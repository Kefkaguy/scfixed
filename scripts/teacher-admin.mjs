import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { MongoClient, ObjectId } from "mongodb";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function generateSecurePassword() {
  return randomBytes(18).toString("base64url");
}

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : "";
}

function requireValue(name, value) {
  if (!value) {
    throw new Error(`Missing --${name}`);
  }
  return value;
}

async function getUsersCollection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI.");

  const client = new MongoClient(uri);
  await client.connect();
  const databaseName = process.env.MONGODB_DB_NAME || "schoolproj";
  const collectionName = process.env.MONGODB_USERS_COLLECTION_NAME || "users";
  const collection = client.db(databaseName).collection(collectionName);
  await collection.createIndex({ username: 1 }, { unique: true });
  return { client, collection };
}

async function createTeacherAccount({ username, displayName, temporaryPassword }) {
  const normalizedUsername = normalizeUsername(username);
  const passwordHash = await hash(temporaryPassword, 12);
  const now = new Date();
  const _id = new ObjectId();
  const { client, collection } = await getUsersCollection();

  try {
    await collection.insertOne({
      _id,
      id: String(_id),
      username: normalizedUsername,
      display_name: displayName,
      password_hash: passwordHash,
      role: "teacher",
      must_change_password: true,
      created_at: now,
      updated_at: now,
    });
  } finally {
    await client.close();
  }

  return { username: normalizedUsername, displayName, temporaryPassword };
}

async function resetTeacherPassword({ username, temporaryPassword }) {
  const normalizedUsername = normalizeUsername(username);
  const passwordHash = await hash(temporaryPassword, 12);
  const { client, collection } = await getUsersCollection();

  try {
    const result = await collection.updateOne(
      { username: normalizedUsername, role: "teacher" },
      {
        $set: {
          password_hash: passwordHash,
          must_change_password: true,
          updated_at: new Date(),
        },
        $unset: {
          passwordHash: "",
        },
      }
    );
    if (result.matchedCount === 0) {
      throw new Error(`Teacher account not found: ${normalizedUsername}`);
    }
  } finally {
    await client.close();
  }

  return { username: normalizedUsername, temporaryPassword };
}

async function seedSampleTeacher() {
  const username = normalizeUsername(process.env.SAMPLE_TEACHER_USERNAME || "sample_teacher");
  const displayName = process.env.SAMPLE_TEACHER_DISPLAY_NAME || "Sample Teacher";
  const temporaryPassword = process.env.SAMPLE_TEACHER_TEMP_PASSWORD || generateSecurePassword();
  const { client, collection } = await getUsersCollection();

  try {
    const existing = await collection.findOne({ username }, { projection: { _id: 1 } });
    if (existing) {
      return { username, displayName, temporaryPassword: null, alreadyExists: true };
    }
  } finally {
    await client.close();
  }

  return createTeacherAccount({ username, displayName, temporaryPassword });
}

function printResult(result) {
  console.log(`Username: ${result.username}`);
  if (result.displayName) console.log(`Display name: ${result.displayName}`);
  if (result.alreadyExists) {
    console.log("Sample teacher already exists. Password was not changed.");
    return;
  }
  console.log(`Temporary password: ${result.temporaryPassword}`);
  console.log("must_change_password: true");
}

async function main() {
  const command = process.argv[2];

  if (command === "create") {
    const username = requireValue("username", readArg("username"));
    const displayName = requireValue("display-name", readArg("display-name"));
    const temporaryPassword = readArg("temporary-password") || generateSecurePassword();
    printResult(await createTeacherAccount({ username, displayName, temporaryPassword }));
    return;
  }

  if (command === "reset-password") {
    const username = requireValue("username", readArg("username"));
    const temporaryPassword = readArg("temporary-password") || generateSecurePassword();
    printResult(await resetTeacherPassword({ username, temporaryPassword }));
    return;
  }

  if (command === "seed-sample") {
    printResult(await seedSampleTeacher());
    return;
  }

  console.log("Usage:");
  console.log("  node scripts/teacher-admin.mjs create --username teacher --display-name \"Art Teacher\"");
  console.log("  node scripts/teacher-admin.mjs reset-password --username teacher");
  console.log("  node scripts/teacher-admin.mjs seed-sample");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
