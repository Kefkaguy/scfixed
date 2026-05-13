import { MongoClient } from "mongodb";

const options = {};
let clientPromise;

function getClientPromise() {
  if (clientPromise) {
    return clientPromise;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  if (process.env.NODE_ENV === "development") {
    const globalWithMongo = globalThis;
    if (!globalWithMongo._mongoClientPromise) {
      globalWithMongo._mongoClientPromise = new MongoClient(uri, options).connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
    return clientPromise;
  }

  clientPromise = new MongoClient(uri, options).connect();
  return clientPromise;
}

export async function getCharactersCollection() {
  const databaseName = process.env.MONGODB_DB_NAME || "schoolproj";
  const collectionName = process.env.MONGODB_COLLECTION_NAME || "characters";
  const mongoClient = await getClientPromise();
  return mongoClient.db(databaseName).collection(collectionName);
}

export async function getClassesCollection() {
  const databaseName = process.env.MONGODB_DB_NAME || "schoolproj";
  const collectionName = process.env.MONGODB_CLASSES_COLLECTION_NAME || "classes";
  const mongoClient = await getClientPromise();
  return mongoClient.db(databaseName).collection(collectionName);
}

export async function getUsersCollection() {
  const databaseName = process.env.MONGODB_DB_NAME || "schoolproj";
  const collectionName = process.env.MONGODB_USERS_COLLECTION_NAME || "users";
  const mongoClient = await getClientPromise();
  return mongoClient.db(databaseName).collection(collectionName);
}

export async function getSubmissionsCollection() {
  const databaseName = process.env.MONGODB_DB_NAME || "schoolproj";
  const collectionName = process.env.MONGODB_SUBMISSIONS_COLLECTION_NAME || "generalSubmissions";
  const mongoClient = await getClientPromise();
  return mongoClient.db(databaseName).collection(collectionName);
}
