import { ObjectId } from "mongodb";
import { getCharactersCollection, getUsersCollection } from "@/lib/mongodb";

let migrationAttempted = false;

export function mapUploadDocument(upload) {
  return {
    ...upload,
    _id: upload?.id || null,
  };
}

function sortByCreatedAtDesc(items) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left?.createdAt || 0).getTime();
    const rightTime = new Date(right?.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

export async function migrateLegacyCharactersToUsers() {
  if (migrationAttempted) {
    return;
  }

  migrationAttempted = true;

  const charactersCollection = await getCharactersCollection();
  const legacyCharacters = await charactersCollection.find({}).toArray();

  if (!legacyCharacters.length) {
    return;
  }

  const usersCollection = await getUsersCollection();
  const migratedIds = [];

  for (const character of legacyCharacters) {
    const userId = character.createdByUserId;
    if (!userId || !ObjectId.isValid(userId) || !character.id) {
      continue;
    }

    const result = await usersCollection.updateOne(
      {
        _id: new ObjectId(userId),
        "uploads.id": { $ne: character.id },
      },
      {
        $push: { uploads: character },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.modifiedCount > 0) {
      migratedIds.push(character._id);
    } else {
      const owner = await usersCollection.findOne(
        { _id: new ObjectId(userId), "uploads.id": character.id },
        { projection: { _id: 1 } }
      );
      if (owner) {
        migratedIds.push(character._id);
      }
    }
  }

  if (migratedIds.length) {
    await charactersCollection.deleteMany({ _id: { $in: migratedIds } });
  }
}

export async function listUploadsForUser(userId) {
  await migrateLegacyCharactersToUsers();

  if (!userId || !ObjectId.isValid(userId)) {
    return [];
  }

  const usersCollection = await getUsersCollection();
  const userDocument = await usersCollection.findOne(
    { _id: new ObjectId(userId) },
    { projection: { uploads: 1 } }
  );

  return sortByCreatedAtDesc(Array.isArray(userDocument?.uploads) ? userDocument.uploads : []);
}

export async function listUploadsForClass(classId) {
  await migrateLegacyCharactersToUsers();

  if (!classId) {
    return [];
  }

  const usersCollection = await getUsersCollection();
  const rows = await usersCollection
    .aggregate([
      {
        $match: {
          uploads: {
            $elemMatch: {
              $or: [
                { classId },
                { visibilityScope: "all" },
              ],
            },
          },
        },
      },
      { $unwind: "$uploads" },
      {
        $match: {
          $or: [
            { "uploads.classId": classId },
            { "uploads.visibilityScope": "all" },
          ],
        },
      },
      { $replaceRoot: { newRoot: "$uploads" } },
      { $sort: { createdAt: -1 } },
    ])
    .toArray();

  return rows;
}

export async function addUploadToUser(userId, upload) {
  const usersCollection = await getUsersCollection();
  await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    {
      $push: { uploads: upload },
      $set: { updatedAt: new Date() },
    }
  );
}

export async function findUploadOwnerById(uploadId) {
  await migrateLegacyCharactersToUsers();

  if (!uploadId) {
    return null;
  }

  const usersCollection = await getUsersCollection();
  const userDocument = await usersCollection.findOne({ "uploads.id": uploadId });

  if (!userDocument) {
    return null;
  }

  const upload = Array.isArray(userDocument.uploads)
    ? userDocument.uploads.find((item) => item.id === uploadId)
    : null;

  if (!upload) {
    return null;
  }

  return { userDocument, upload };
}

export async function replaceUserUpload(userId, uploadId, nextUpload) {
  const usersCollection = await getUsersCollection();
  const result = await usersCollection.findOneAndUpdate(
    { _id: new ObjectId(userId), "uploads.id": uploadId },
    {
      $set: {
        "uploads.$": nextUpload,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function removeUserUpload(userId, uploadId) {
  const usersCollection = await getUsersCollection();
  return usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    {
      $pull: { uploads: { id: uploadId } },
      $set: { updatedAt: new Date() },
    }
  );
}
