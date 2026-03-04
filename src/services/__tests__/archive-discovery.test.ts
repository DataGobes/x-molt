import { describe, it, expect } from "vitest";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { discoverArchives } from "../archive-discovery.js";

describe("discoverArchives", () => {
  it("returns empty array for nonexistent directory", () => {
    const result = discoverArchives("/tmp/nonexistent-dir-xyz");
    expect(result).toEqual([]);
  });

  it("discovers real archive in data/ directory", () => {
    const dataDir = join(process.cwd(), "data");
    if (!existsSync(dataDir)) return;

    const archives = discoverArchives(dataDir);

    // We know there's at least one archive folder in data/
    expect(archives.length).toBeGreaterThan(0);

    const archive = archives[0];
    expect(archive.hasTweets).toBe(true);
    expect(archive.path).toContain("data/");
    expect(archive.folderName).toBeTruthy();
  });

  it("reports available data files correctly", () => {
    const dataDir = join(process.cwd(), "data");
    if (!existsSync(dataDir)) return;

    const archives = discoverArchives(dataDir);
    if (archives.length === 0) return;

    const archive = archives[0];
    // Our real archive has all these files
    expect(archive.hasLikes).toBe(true);
    expect(archive.hasFollowers).toBe(true);
    expect(archive.hasFollowing).toBe(true);
    expect(archive.hasBlocks).toBe(true);
    expect(archive.hasMutes).toBe(true);
    expect(archive.hasAccount).toBe(true);
    expect(archive.hasProfile).toBe(true);
    // New data types — check that the boolean flags exist
    expect(typeof archive.hasDirectMessages).toBe("boolean");
    expect(typeof archive.hasNoteTweets).toBe("boolean");
    expect(typeof archive.hasDeletedTweets).toBe("boolean");
    expect(typeof archive.hasGrokChats).toBe("boolean");
    expect(typeof archive.hasIpAudit).toBe("boolean");
    expect(typeof archive.hasPersonalization).toBe("boolean");
    expect(typeof archive.hasContacts).toBe("boolean");
    expect(typeof archive.hasAdEngagements).toBe("boolean");
    expect(typeof archive.hasAdImpressions).toBe("boolean");
    expect(typeof archive.hasConnectedApps).toBe("boolean");
    expect(typeof archive.hasDeviceTokens).toBe("boolean");
    expect(typeof archive.hasApps).toBe("boolean");
  });

  it("ignores directories without data/tweets.js", () => {
    const tmpDir = join("/tmp", "archive-discovery-test");
    const fakeDir = join(tmpDir, "not-an-archive");
    mkdirSync(join(fakeDir, "data"), { recursive: true });
    writeFileSync(join(fakeDir, "data", "like.js"), "// no tweets.js here");

    const archives = discoverArchives(tmpDir);
    expect(archives).toHaveLength(0);

    rmSync(tmpDir, { recursive: true });
  });

  it("ignores files (non-directories) in scan dir", () => {
    const tmpDir = join("/tmp", "archive-discovery-test2");
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, "somefile.txt"), "not a directory");

    const archives = discoverArchives(tmpDir);
    expect(archives).toHaveLength(0);

    rmSync(tmpDir, { recursive: true });
  });
});
