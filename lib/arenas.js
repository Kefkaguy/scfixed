import { ObjectId } from "mongodb"
import { getUsersCollection } from "@/lib/mongodb"

const DIFFICULTY_COLORS = {
  1: {
    color: "#44aaff",
    accentColor: "#aaddff",
    bg: "radial-gradient(ellipse 80% 60% at 50% 80%, #001133 0%, #070810 70%)",
  },
  2: {
    color: "#e8001a",
    accentColor: "#ff6644",
    bg: "radial-gradient(ellipse 80% 60% at 50% 80%, #2a0000 0%, #070810 70%)",
  },
  3: {
    color: "#9933cc",
    accentColor: "#cc66ff",
    bg: "radial-gradient(ellipse 80% 60% at 50% 80%, #1a0033 0%, #070810 70%)",
  },
  4: {
    color: "#008000",
    accentColor: "#d7ffd7",
    bg: "radial-gradient(ellipse 80% 60% at 50% 80%, #092300 0%, #070810 70%)",
  },
  5: {
    color: "#ff8800",
    accentColor: "#ffcc44",
    bg: "radial-gradient(ellipse 80% 60% at 50% 80%, #2a1000 0%, #070810 70%)",
  },
  6: {
    color: "#f0c020",
    accentColor: "#fff4aa",
    bg: "radial-gradient(ellipse 80% 60% at 50% 80%, #332200 0%, #070810 70%)",
  },
  7: {
    color: "#ff44aa",
    accentColor: "#ffc2e5",
    bg: "radial-gradient(ellipse 80% 60% at 50% 80%, #33001f 0%, #070810 70%)",
  },
  8: {
    color: "#00ddcc",
    accentColor: "#b9fff8",
    bg: "radial-gradient(ellipse 80% 60% at 50% 80%, #00302d 0%, #070810 70%)",
  },
  9: {
    color: "#c9ff3d",
    accentColor: "#f2ffb8",
    bg: "radial-gradient(ellipse 80% 60% at 50% 80%, #263300 0%, #070810 70%)",
  },
  10: {
    color: "#ffffff",
    accentColor: "#f0c020",
    bg: "radial-gradient(ellipse 80% 60% at 50% 80%, #333333 0%, #070810 70%)",
  },
}

export function normalizeDifficulty(value, fallback = 1) {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.min(10, Math.max(1, parsed))
}

export function buildArenaPresentation(arena) {
  const difficulty = normalizeDifficulty(arena?.difficulty, 1)
  const palette = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS[1]

  return {
    ...arena,
    difficulty,
    number: arena?.number ?? difficulty,
    subtitle: arena?.subtitle || arena?.className || "Custom Arena",
    tags:
      Array.isArray(arena?.tags) && arena.tags.length
        ? arena.tags
        : ["CUSTOM", "CLASS ARENA"],
    pattern: arena?.pattern || "custom",
    color: arena?.color || palette.color,
    accentColor: arena?.accentColor || palette.accentColor,
    bg: arena?.bg || palette.bg,
  }
}

export function mapArenaDocument(arena) {
  return {
    ...buildArenaPresentation(arena),
    _id: arena?.id || null,
  }
}

export async function listArenasForClass(classId) {
  if (!classId) {
    return []
  }

  const usersCollection = await getUsersCollection()
  return usersCollection
    .aggregate([
      {
        $match: {
          customLevels: {
            $elemMatch: {
              $or: [{ classId }, { visibilityScope: "all" }],
            },
          },
        },
      },
      { $unwind: "$customLevels" },
      {
        $match: {
          $or: [
            { "customLevels.classId": classId },
            { "customLevels.visibilityScope": "all" },
          ],
        },
      },
      { $replaceRoot: { newRoot: "$customLevels" } },
      { $sort: { createdAt: -1 } },
    ])
    .toArray()
}

export async function addArenaToUser(userId, arena) {
  const usersCollection = await getUsersCollection()
  await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    {
      $push: { customLevels: arena },
      $set: { updatedAt: new Date() },
    },
  )
}

export async function findArenaOwnerById(arenaId) {
  if (!arenaId) {
    return null
  }

  const usersCollection = await getUsersCollection()
  const userDocument = await usersCollection.findOne({
    "customLevels.id": arenaId,
  })

  if (!userDocument) {
    return null
  }

  const arena = Array.isArray(userDocument.customLevels)
    ? userDocument.customLevels.find((item) => item.id === arenaId)
    : null

  if (!arena) {
    return null
  }

  return { userDocument, arena }
}

export async function replaceUserArena(userId, arenaId, nextArena) {
  const usersCollection = await getUsersCollection()
  return usersCollection.findOneAndUpdate(
    { _id: new ObjectId(userId), "customLevels.id": arenaId },
    {
      $set: {
        "customLevels.$": nextArena,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  )
}

export async function removeUserArena(userId, arenaId) {
  const usersCollection = await getUsersCollection()
  return usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    {
      $pull: { customLevels: { id: arenaId } },
      $set: { updatedAt: new Date() },
    },
  )
}
