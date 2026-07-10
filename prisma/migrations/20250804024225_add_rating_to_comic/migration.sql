-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_comics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "genre" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "rating" TEXT NOT NULL DEFAULT 'all',
    "authorName" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "authorId" TEXT,
    CONSTRAINT "comics_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_comics" ("authorId", "authorName", "createdAt", "description", "genre", "id", "isOfficial", "likeCount", "status", "thumbnail", "title", "updatedAt", "viewCount") SELECT "authorId", "authorName", "createdAt", "description", "genre", "id", "isOfficial", "likeCount", "status", "thumbnail", "title", "updatedAt", "viewCount" FROM "comics";
DROP TABLE "comics";
ALTER TABLE "new_comics" RENAME TO "comics";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
