import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput, Spinner } from "@inkjs/ui";
import { FullScreen } from "../components/full-screen.js";
import {
  loadArchiveFolder,
  archiveTweetToInsert,
} from "../services/archive-parser.js";
import {
  discoverArchives,
  type DiscoveredArchive,
} from "../services/archive-discovery.js";
import { getDataDir } from "../config.js";
import type { ArchiveData } from "../types.js";
import {
  BRAND_COLOR,
  ERROR_COLOR,
  SUCCESS_COLOR,
  MUTED_COLOR,
} from "../utils/constants.js";

type Step = "discovery" | "manual-input" | "importing" | "done";

interface ImportArchiveProps {
  archive: {
    store: {
      insertMany: (tweets: any[]) => number;
      insertManyLikes: (likes: any[]) => number;
      insertManyFollowers: (followers: any[]) => number;
      insertManyFollowing: (following: any[]) => number;
      insertManyBlocks: (blocks: any[]) => number;
      insertManyMutes: (mutes: any[]) => number;
      insertAccount: (account: any) => void;
      insertProfile: (profile: any) => void;
      getTweetCount: () => number;
      insertManyDirectMessages: (conversations: any[]) => { conversations: number; messages: number };
      insertManyNoteTweets: (notes: any[]) => number;
      insertManyDeletedTweets: (tweets: any[]) => number;
      insertManyGrokChats: (chats: any[]) => number;
      insertManyIpAudit: (entries: any[]) => number;
      insertManyInterests: (interests: any[]) => number;
      insertManyDemographics: (demographics: any[]) => number;
      insertManyContacts: (contacts: any[]) => number;
      insertManyAdEngagements: (engagements: any[]) => number;
      insertManyAdImpressions: (impressions: any[]) => number;
      insertManyConnectedApps: (apps: any[]) => number;
      insertManyDeviceTokens: (tokens: any[]) => number;
      insertManyApps: (apps: any[]) => number;
    };
  };
  onBack: () => void;
}

interface ImportResult {
  tweets: number;
  likes: number;
  followers: number;
  following: number;
  blocks: number;
  mutes: number;
  hasAccount: boolean;
  hasProfile: boolean;
  dmConversations: number;
  directMessages: number;
  noteTweets: number;
  deletedTweets: number;
  grokChats: number;
  ipAudit: number;
  interests: number;
  demographics: number;
  contacts: number;
  adEngagements: number;
  adImpressions: number;
  connectedApps: number;
  deviceTokens: number;
  apps: number;
}

function importArchiveData(
  data: ArchiveData,
  store: ImportArchiveProps["archive"]["store"]
): ImportResult {
  const tweets =
    data.tweets.length > 0
      ? store.insertMany(data.tweets.map(archiveTweetToInsert))
      : 0;

  const likes =
    data.likes.length > 0
      ? store.insertManyLikes(
          data.likes.map((l) => ({
            tweetId: l.like.tweetId,
            fullText: l.like.fullText,
            expandedUrl: l.like.expandedUrl,
          }))
        )
      : 0;

  const followers =
    data.followers.length > 0
      ? store.insertManyFollowers(
          data.followers.map((f) => ({
            accountId: f.follower.accountId,
            userLink: f.follower.userLink,
          }))
        )
      : 0;

  const following =
    data.following.length > 0
      ? store.insertManyFollowing(
          data.following.map((f) => ({
            accountId: f.following.accountId,
            userLink: f.following.userLink,
          }))
        )
      : 0;

  const blocks =
    data.blocks.length > 0
      ? store.insertManyBlocks(
          data.blocks.map((b) => ({
            accountId: b.blocking.accountId,
            userLink: b.blocking.userLink,
          }))
        )
      : 0;

  const mutes =
    data.mutes.length > 0
      ? store.insertManyMutes(
          data.mutes.map((m) => ({
            accountId: m.muting.accountId,
            userLink: m.muting.userLink,
          }))
        )
      : 0;

  if (data.account) {
    const a = data.account.account;
    store.insertAccount({
      id: a.accountId,
      email: a.email,
      username: a.username,
      displayName: a.accountDisplayName,
      createdAt: a.createdAt,
      createdVia: a.createdVia,
    });
  }

  if (data.profile) {
    const p = data.profile.profile;
    store.insertProfile({
      bio: p.description.bio,
      website: p.description.website,
      location: p.description.location,
      avatarUrl: p.avatarMediaUrl,
    });
  }

  // Direct Messages
  const dmResult = data.directMessages.length > 0
    ? store.insertManyDirectMessages(data.directMessages)
    : { conversations: 0, messages: 0 };

  // Note Tweets
  const noteTweets = data.noteTweets.length > 0
    ? store.insertManyNoteTweets(data.noteTweets.map((n) => ({
        noteTweetId: n.noteTweet.noteTweetId,
        text: n.noteTweet.core.text,
        createdAt: n.noteTweet.createdAt,
        updatedAt: n.noteTweet.updatedAt ?? "",
        lifecycle: n.noteTweet.lifecycle?.name ?? "",
      })))
    : 0;

  // Deleted Tweets
  const deletedTweets = data.deletedTweets.length > 0
    ? store.insertManyDeletedTweets(data.deletedTweets.map(archiveTweetToInsert))
    : 0;

  // Grok Chats
  const grokChats = data.grokChats.length > 0
    ? store.insertManyGrokChats(data.grokChats.map((g) => ({
        chatId: g.grokChatItem.chatId,
        accountId: g.grokChatItem.accountId ?? "",
        sender: g.grokChatItem.sender.name,
        message: g.grokChatItem.message,
        createdAt: g.grokChatItem.createdAt,
        grokMode: g.grokChatItem.grokMode?.name ?? "",
      })))
    : 0;

  // IP Audit
  const ipAudit = data.ipAudit.length > 0
    ? store.insertManyIpAudit(data.ipAudit.map((e) => ({
        accountId: e.ipAudit.accountId,
        loginIp: e.ipAudit.loginIp,
        loginPort: e.ipAudit.loginPortNumber ?? "",
        createdAt: e.ipAudit.createdAt,
      })))
    : 0;

  // Personalization → interests + demographics
  let interestCount = 0;
  let demographicCount = 0;
  if (data.personalization) {
    const p = data.personalization.p13nData;
    const interests = p.interests?.interests ?? [];
    if (interests.length > 0) {
      interestCount = store.insertManyInterests(interests.map((i) => ({
        name: i.name,
        isDisabled: i.isDisabled ?? false,
      })));
    }
    const demographics: { type: string; value: string }[] = [];
    const langs = p.demographics?.languages ?? [];
    for (const lang of langs) {
      demographics.push({ type: "language", value: lang.language });
    }
    if (p.demographics?.genderInfo?.gender) {
      demographics.push({ type: "gender", value: p.demographics.genderInfo.gender });
    }
    if (demographics.length > 0) {
      demographicCount = store.insertManyDemographics(demographics);
    }
  }

  // Contacts → flatten emails + phones
  let contactCount = 0;
  if (data.contacts.length > 0) {
    const flat: { type: "email" | "phone"; value: string }[] = [];
    for (const c of data.contacts) {
      for (const email of c.contact.emails ?? []) {
        flat.push({ type: "email", value: email });
      }
      for (const phone of c.contact.phoneNumbers ?? []) {
        flat.push({ type: "phone", value: phone });
      }
    }
    if (flat.length > 0) {
      contactCount = store.insertManyContacts(flat);
    }
  }

  // Ad Engagements (pass raw archive objects — store handles nested extraction)
  const adEngagements = data.adEngagements.length > 0
    ? store.insertManyAdEngagements(data.adEngagements)
    : 0;

  // Ad Impressions
  const adImpressions = data.adImpressions.length > 0
    ? store.insertManyAdImpressions(data.adImpressions)
    : 0;

  // Connected Apps
  const connectedApps = data.connectedApps.length > 0
    ? store.insertManyConnectedApps(data.connectedApps.map((a) => ({
        id: a.connectedApplication.id,
        name: a.connectedApplication.name,
        description: a.connectedApplication.description ?? "",
        permissions: (a.connectedApplication.permissions ?? []).join(", "),
        approvedAt: a.connectedApplication.approvedAt,
        orgName: a.connectedApplication.organization?.name ?? "",
        orgUrl: a.connectedApplication.organization?.url ?? "",
      })))
    : 0;

  // Device Tokens
  const deviceTokens = data.deviceTokens.length > 0
    ? store.insertManyDeviceTokens(data.deviceTokens.map((t) => ({
        clientApplicationId: t.deviceToken.clientApplicationId,
        clientApplicationName: t.deviceToken.clientApplicationName ?? "",
        token: t.deviceToken.token,
        createdAt: t.deviceToken.createdAt,
        lastSeenAt: t.deviceToken.lastSeenAt ?? "",
      })))
    : 0;

  // Apps
  const apps = data.apps.length > 0
    ? store.insertManyApps(data.apps.map((a) => ({
        appId: a.app.appId,
        appNames: (a.app.appNames ?? []).join(", "),
      })))
    : 0;

  return {
    tweets,
    likes,
    followers,
    following,
    blocks,
    mutes,
    hasAccount: !!data.account,
    hasProfile: !!data.profile,
    dmConversations: dmResult.conversations,
    directMessages: dmResult.messages,
    noteTweets,
    deletedTweets,
    grokChats,
    ipAudit,
    interests: interestCount,
    demographics: demographicCount,
    contacts: contactCount,
    adEngagements,
    adImpressions,
    connectedApps,
    deviceTokens,
    apps,
  };
}

export function ImportArchiveScreen({ archive, onBack }: ImportArchiveProps) {
  const [step, setStep] = useState<Step>("discovery");
  const [error, setError] = useState<string | null>(null);
  const [archives, setArchives] = useState<DiscoveredArchive[]>([]);
  const [selected, setSelected] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Auto-discover archives on mount
  useEffect(() => {
    const found = discoverArchives(getDataDir());
    setArchives(found);
  }, []);

  // The list: discovered archives + "Enter custom path" option
  const optionCount = archives.length + 1;

  useInput((input, key) => {
    if (step !== "discovery") return;

    if (key.upArrow || input === "k") {
      setSelected((prev) => (prev > 0 ? prev - 1 : optionCount - 1));
    }
    if (key.downArrow || input === "j") {
      setSelected((prev) => (prev < optionCount - 1 ? prev + 1 : 0));
    }
    if (key.return) {
      if (selected < archives.length) {
        handleImport(archives[selected].path);
      } else {
        setStep("manual-input");
      }
    }
  });

  const handleImport = (folderPath: string) => {
    setStep("importing");
    setError(null);

    try {
      const path = folderPath.trim().replace(/^['"]|['"]$/g, "");
      const data = loadArchiveFolder(path);
      const result = importArchiveData(data, archive.store);
      setImportResult(result);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import archive");
      setStep("discovery");
    }
  };

  return (
    <FullScreen
      title="Import Archive"
      hints={[
        ...(step === "discovery"
          ? ["j/k: navigate", "enter: select"]
          : []),
        "esc: back",
      ]}
      showBack
    >

      {error && (
        <Box marginBottom={1}>
          <Text color={ERROR_COLOR}>Error: {error}</Text>
        </Box>
      )}

      {step === "discovery" && (
        <Box flexDirection="column">
          <Text>
            {archives.length > 0
              ? "Found archive folders in data/:"
              : "No archive folders found in data/."}
          </Text>
          <Text color={MUTED_COLOR}>
            Download at: https://x.com/settings/download_your_data
          </Text>
          <Box marginTop={1} flexDirection="column">
            {archives.map((a, i) => {
              const isSelected = i === selected;
              const fileCount = [
                a.hasTweets && "tweets",
                a.hasLikes && "likes",
                a.hasFollowers && "followers",
                a.hasFollowing && "following",
                a.hasBlocks && "blocks",
                a.hasMutes && "mutes",
                a.hasAccount && "account",
                a.hasProfile && "profile",
                a.hasDirectMessages && "DMs",
                a.hasNoteTweets && "notes",
                a.hasDeletedTweets && "deleted",
                a.hasGrokChats && "grok",
                a.hasIpAudit && "ip-audit",
                a.hasPersonalization && "personalization",
                a.hasContacts && "contacts",
                a.hasAdEngagements && "ad-engagements",
                a.hasAdImpressions && "ad-impressions",
                a.hasConnectedApps && "apps",
                a.hasDeviceTokens && "device-tokens",
                a.hasApps && "apps-list",
              ].filter(Boolean);

              return (
                <Box key={a.path}>
                  <Text color={isSelected ? BRAND_COLOR : undefined}>
                    {isSelected ? "  > " : "    "}
                  </Text>
                  <Text
                    bold={isSelected}
                    color={isSelected ? BRAND_COLOR : undefined}
                  >
                    {a.folderName}
                  </Text>
                  <Text color={MUTED_COLOR}>
                    {"  "}({fileCount.length} data files)
                  </Text>
                </Box>
              );
            })}
            <Box>
              <Text
                color={selected === archives.length ? BRAND_COLOR : undefined}
              >
                {selected === archives.length ? "  > " : "    "}
              </Text>
              <Text
                bold={selected === archives.length}
                color={selected === archives.length ? BRAND_COLOR : undefined}
              >
                Enter custom path...
              </Text>
            </Box>
          </Box>
        </Box>
      )}

      {step === "manual-input" && (
        <Box flexDirection="column">
          <Text>Enter the path to your X data archive folder:</Text>
          <Text color={MUTED_COLOR}>
            The folder should contain a data/ subfolder with tweets.js
          </Text>
          <Box marginTop={1}>
            <Text color={BRAND_COLOR}>path: </Text>
            <TextInput
              placeholder="/path/to/twitter-archive-folder"
              onSubmit={(path: string) => handleImport(path)}
            />
          </Box>
        </Box>
      )}

      {step === "importing" && (
        <Box>
          <Spinner label="Parsing and importing archive data..." />
        </Box>
      )}

      {step === "done" && importResult && (
        <Box flexDirection="column">
          <Text color={SUCCESS_COLOR}>Archive imported successfully!</Text>
          <Box marginTop={1} flexDirection="column">
            {importResult.tweets > 0 && (
              <Text>
                {"  "}Tweets:{" "}
                <Text bold>{importResult.tweets.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.likes > 0 && (
              <Text>
                {"  "}Likes:{" "}
                <Text bold>{importResult.likes.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.followers > 0 && (
              <Text>
                {"  "}Followers:{" "}
                <Text bold>{importResult.followers.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.following > 0 && (
              <Text>
                {"  "}Following:{" "}
                <Text bold>{importResult.following.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.blocks > 0 && (
              <Text>
                {"  "}Blocks:{" "}
                <Text bold>{importResult.blocks.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.mutes > 0 && (
              <Text>
                {"  "}Mutes:{" "}
                <Text bold>{importResult.mutes.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.hasAccount && (
              <Text>
                {"  "}Account: <Text bold>imported</Text>
              </Text>
            )}
            {importResult.hasProfile && (
              <Text>
                {"  "}Profile: <Text bold>imported</Text>
              </Text>
            )}
            {importResult.dmConversations > 0 && (
              <Text>
                {"  "}DM Conversations:{" "}
                <Text bold>{importResult.dmConversations.toLocaleString()}</Text>
                {" "}({importResult.directMessages.toLocaleString()} messages)
              </Text>
            )}
            {importResult.noteTweets > 0 && (
              <Text>
                {"  "}Note Tweets:{" "}
                <Text bold>{importResult.noteTweets.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.deletedTweets > 0 && (
              <Text>
                {"  "}Deleted Tweets:{" "}
                <Text bold>{importResult.deletedTweets.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.grokChats > 0 && (
              <Text>
                {"  "}Grok Chats:{" "}
                <Text bold>{importResult.grokChats.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.ipAudit > 0 && (
              <Text>
                {"  "}IP Audit:{" "}
                <Text bold>{importResult.ipAudit.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.interests > 0 && (
              <Text>
                {"  "}Interests:{" "}
                <Text bold>{importResult.interests.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.demographics > 0 && (
              <Text>
                {"  "}Demographics:{" "}
                <Text bold>{importResult.demographics.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.contacts > 0 && (
              <Text>
                {"  "}Contacts:{" "}
                <Text bold>{importResult.contacts.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.adEngagements > 0 && (
              <Text>
                {"  "}Ad Engagements:{" "}
                <Text bold>{importResult.adEngagements.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.adImpressions > 0 && (
              <Text>
                {"  "}Ad Impressions:{" "}
                <Text bold>{importResult.adImpressions.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.connectedApps > 0 && (
              <Text>
                {"  "}Connected Apps:{" "}
                <Text bold>{importResult.connectedApps.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.deviceTokens > 0 && (
              <Text>
                {"  "}Device Tokens:{" "}
                <Text bold>{importResult.deviceTokens.toLocaleString()}</Text>
              </Text>
            )}
            {importResult.apps > 0 && (
              <Text>
                {"  "}Apps:{" "}
                <Text bold>{importResult.apps.toLocaleString()}</Text>
              </Text>
            )}
          </Box>
          <Box marginTop={1}>
            <Text color={MUTED_COLOR}>
              Press esc to go back. Browse and Batch Delete are now available.
            </Text>
          </Box>
        </Box>
      )}

    </FullScreen>
  );
}
