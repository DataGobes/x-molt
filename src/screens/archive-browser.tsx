import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput } from "@inkjs/ui";
import { Header } from "../components/header.js";
import { Footer } from "../components/footer.js";
import { SplitPane } from "../components/split-pane.js";
import { TabBar, type Tab } from "../components/tab-bar.js";
import { DetailPane, TweetListPane, type BrowseTab } from "../components/detail-pane.js";
import { DateTree } from "../components/date-tree.js";
import { useTerminalSize } from "../hooks/use-terminal-size.js";
import { useDateTree } from "../hooks/use-date-tree.js";
import type {
  StoredTweet,
  StoredLike,
  StoredFollower,
  StoredFollowing,
  StoredBlock,
  StoredMute,
  DateHierarchy,
} from "../types.js";
import { deleteTweet as apiDeleteTweet, getTweetById as apiGetTweetById } from "../services/twitter-client.js";
import { CostBadge } from "../components/cost-badge.js";
import { formatDate, formatNumber, truncate } from "../utils/format.js";
import { BRAND_COLOR, MUTED_COLOR, ERROR_COLOR, SUCCESS_COLOR } from "../utils/constants.js";

const TAB_KEYS: BrowseTab[] = ["tweets", "likes", "followers", "following", "blocks", "mutes"];
const TAB_LABELS: Record<BrowseTab, string> = {
  tweets: "Tweets",
  likes: "Likes",
  followers: "Followers",
  following: "Following",
  blocks: "Blocks",
  mutes: "Mutes",
};

// Chrome = header (3 lines) + tab bar (1) + tab margin (1) + footer (2) + margins (1)
const CHROME_ROWS = 8;

type AnyItem = StoredTweet | StoredLike | StoredFollower | StoredFollowing | StoredBlock | StoredMute;

interface ArchiveBrowserProps {
  archive: ReturnType<typeof import("../hooks/use-archive.js").useArchive>;
  onBack: () => void;
}

export function ArchiveBrowserScreen({ archive, onBack }: ArchiveBrowserProps) {
  const { width, height } = useTerminalSize();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [items, setItems] = useState<AnyItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [semanticMode, setSemanticMode] = useState(false);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [hierarchy, setHierarchy] = useState<DateHierarchy>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "done" | "error">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<"idle" | "refreshing" | "done" | "error">("idle");

  // Focus model: tree or tweets pane
  const [focus, setFocus] = useState<"tree" | "tweets">("tree");
  const [dayTweets, setDayTweets] = useState<StoredTweet[]>([]);
  const [dayTweetIndex, setDayTweetIndex] = useState(0);

  const activeTab = TAB_KEYS[activeTabIndex]!;
  const leftWidth = Math.max(30, Math.floor(width * 0.35));
  const rightWidth = width - leftWidth - 1;
  const paneHeight = Math.max(5, height - CHROME_ROWS);
  const pageSize = Math.max(3, paneHeight - 2); // -2 for status line in list

  // Tree is active for tweets tab when not searching
  const treeActive = activeTab === "tweets" && !searchQuery;

  const dateTree = useDateTree(
    hierarchy,
    pageSize
  );

  // Auto-load tweets when tree cursor lands on a day node
  useEffect(() => {
    if (treeActive && dateTree.selectedDay) {
      const { year, month, day } = dateTree.selectedDay;
      const tweets = archive.getTweetsByDay(year, month, day);
      setDayTweets(tweets);
      // Only reset index when day changes (not on every render)
      if (focus === "tree") {
        setDayTweetIndex(0);
      }
    } else if (treeActive) {
      setDayTweets([]);
      setDayTweetIndex(0);
    }
  }, [treeActive, dateTree.selectedDay?.year, dateTree.selectedDay?.month, dateTree.selectedDay?.day]);

  // Build tab data with counts
  const tabs: Tab[] = TAB_KEYS.map((key) => ({
    label: TAB_LABELS[key],
    count: getCount(key),
  }));

  function getCount(tab: BrowseTab): number {
    switch (tab) {
      case "tweets": return archive.getTweetCount();
      case "likes": return archive.getLikeCount();
      case "followers": return archive.getFollowerCount();
      case "following": return archive.getFollowingCount();
      case "blocks": return archive.getBlockCount();
      case "mutes": return archive.getMuteCount();
    }
  }

  const loadItems = useCallback((tab: BrowseTab, query?: string) => {
    const limit = 500; // load a reasonable batch
    let result: AnyItem[];

    if (query) {
      switch (tab) {
        case "tweets":
          result = archive.search(query, limit);
          break;
        case "likes":
          result = archive.searchLikes(query, limit);
          break;
        default:
          // For user-type tabs, no search — just load all
          result = loadTabData(tab, limit);
          break;
      }
    } else {
      result = loadTabData(tab, limit);
    }

    setItems(result);
    setSelectedIndex(0);
    setPage(0);
  }, [archive]);

  function loadTabData(tab: BrowseTab, limit: number): AnyItem[] {
    switch (tab) {
      case "tweets": return archive.getTweets(limit);
      case "likes": return archive.getLikes(limit);
      case "followers": return archive.getFollowers(limit);
      case "following": return archive.getFollowing(limit);
      case "blocks": return archive.getBlocks(limit);
      case "mutes": return archive.getMutes(limit);
    }
  }

  // Load items on mount; load hierarchy for tweets tab
  useEffect(() => {
    setHierarchy(archive.getDateHierarchy());
    loadItems(activeTab);
  }, []);

  // Pagination
  const totalPages = Math.ceil(items.length / pageSize);
  const start = page * pageSize;
  const visible = items.slice(start, start + pageSize);
  const selectedItem = visible[selectedIndex] ?? null;

  // Get the currently active tweet (for actions like o/d/r)
  const activeTweet: StoredTweet | null = useMemo(() => {
    if (focus === "tweets" && dayTweets.length > 0) {
      return dayTweets[dayTweetIndex] ?? null;
    }
    return null;
  }, [focus, dayTweets, dayTweetIndex]);

  useInput((input, key) => {
    if (searchMode) return;

    // Delete confirmation flow
    if (confirmDelete) {
      if (input === "y") {
        const id = confirmDelete;
        setConfirmDelete(null);
        setDeleteStatus("deleting");
        setDeleteError(null);
        (async () => {
          try {
            const deleted = await apiDeleteTweet(id);
            if (deleted) {
              archive.markDeleted(id);
              setHierarchy(archive.getDateHierarchy());
              setDeleteStatus("done");
              setTimeout(() => setDeleteStatus("idle"), 1500);
            } else {
              setDeleteError("Tweet may already be deleted on X");
              setDeleteStatus("error");
              setTimeout(() => {
                setDeleteStatus("idle");
                setDeleteError(null);
              }, 3000);
            }
          } catch (err) {
            setDeleteError(err instanceof Error ? err.message : String(err));
            setDeleteStatus("error");
            setTimeout(() => {
              setDeleteStatus("idle");
              setDeleteError(null);
            }, 3000);
          }
        })();
      } else if (input === "n" || key.escape) {
        setConfirmDelete(null);
      }
      return;
    }

    // Navigation — branched on tree vs flat list
    if (treeActive) {
      if (focus === "tweets") {
        // Tweet list pane navigation
        if (key.upArrow || input === "k") {
          setDayTweetIndex((prev) => Math.max(0, prev - 1));
        }
        if (key.downArrow || input === "j") {
          setDayTweetIndex((prev) => Math.min(dayTweets.length - 1, prev + 1));
        }
        // Open tweet URL in browser
        if (input === "o" && activeTweet) {
          import("child_process").then(({ execFile }) => {
            execFile("open", [`https://x.com/i/status/${activeTweet.id}`]);
          });
        }
        // Delete tweet
        if (input === "d" && activeTweet && !activeTweet.deleted) {
          setConfirmDelete(activeTweet.id);
        }
        // Refresh live metrics
        if (input === "r" && activeTweet && refreshStatus !== "refreshing") {
          setRefreshStatus("refreshing");
          (async () => {
            try {
              const live = await apiGetTweetById(activeTweet.id);
              if (live) {
                archive.store.updateTweetMetrics(activeTweet.id, live.publicMetrics.likes, live.publicMetrics.retweets);
                // Reload day tweets to reflect updated metrics
                if (dateTree.selectedDay) {
                  const { year, month, day } = dateTree.selectedDay;
                  setDayTweets(archive.getTweetsByDay(year, month, day));
                }
                setRefreshStatus("done");
                setTimeout(() => setRefreshStatus("idle"), 1500);
              } else {
                setRefreshStatus("error");
                setTimeout(() => setRefreshStatus("idle"), 3000);
              }
            } catch {
              setRefreshStatus("error");
              setTimeout(() => setRefreshStatus("idle"), 3000);
            }
          })();
        }
        // Escape returns to tree
        if (key.escape) {
          setFocus("tree");
          return;
        }
        // Don't process other keys when in tweets focus
        return;
      }

      // Tree focus
      if (key.upArrow || input === "k") {
        dateTree.moveUp();
      }
      if (key.downArrow || input === "j") {
        dateTree.moveDown();
      }
      // Enter: on day node → focus tweets pane; on group node → toggle
      if (key.return) {
        const row = dateTree.rows[dateTree.cursorIndex];
        if (row) {
          if (row.kind === "day" && dayTweets.length > 0) {
            setFocus("tweets");
            setDayTweetIndex(0);
          } else if (row.kind !== "day") {
            dateTree.toggle(row.key);
          }
        }
      }
      // Right arrow: expand if collapsed
      if (key.rightArrow) {
        const row = dateTree.rows[dateTree.cursorIndex];
        if (row && row.kind !== "day" && !row.expanded) {
          dateTree.toggle(row.key);
        }
      }
      // Left arrow: collapse if expanded
      if (key.leftArrow) {
        const row = dateTree.rows[dateTree.cursorIndex];
        if (row && row.kind !== "day" && row.expanded) {
          dateTree.toggle(row.key);
        }
      }
    } else {
      // Flat list navigation
      if (key.upArrow || input === "k") {
        setSelectedIndex((prev) => {
          if (prev > 0) return prev - 1;
          if (page > 0) {
            setPage((p) => p - 1);
            return pageSize - 1;
          }
          return prev;
        });
      }
      if (key.downArrow || input === "j") {
        setSelectedIndex((prev) => {
          if (prev < visible.length - 1) return prev + 1;
          if (page < totalPages - 1) {
            setPage((p) => p + 1);
            return 0;
          }
          return prev;
        });
      }
    }

    // Tab switching — load items synchronously before changing tab
    if (key.tab || input === "l") {
      const next = (activeTabIndex + 1) % TAB_KEYS.length;
      const nextTab = TAB_KEYS[next]!;
      loadItems(nextTab);
      setActiveTabIndex(next);
      setSearchQuery("");
      setFocus("tree");
    }
    if (input === "h") {
      const prev = (activeTabIndex - 1 + TAB_KEYS.length) % TAB_KEYS.length;
      const prevTab = TAB_KEYS[prev]!;
      loadItems(prevTab);
      setActiveTabIndex(prev);
      setSearchQuery("");
      setFocus("tree");
    }

    // Toggle semantic search mode
    if (input === "?") {
      setSemanticMode((prev) => !prev);
    }

    // Search
    if (input === "/") {
      setSearchMode(true);
    }

    // Escape
    if (key.escape) {
      if (searchQuery) {
        setSearchQuery("");
        loadItems(activeTab);
      } else {
        onBack();
      }
    }
  });

  const handleSearchSubmit = async (query: string) => {
    setSearchMode(false);
    const trimmed = query.trim();
    setSearchQuery(trimmed);
    if (trimmed) {
      if (semanticMode && (activeTab === "tweets" || activeTab === "likes")) {
        setSemanticLoading(true);
        try {
          const results = activeTab === "likes"
            ? await archive.semanticSearchLikes(trimmed, 500)
            : await archive.semanticSearch(trimmed, 500);
          setItems(results);
          setSelectedIndex(0);
          setPage(0);
        } catch {
          // Fall back to keyword search
          loadItems(activeTab, trimmed);
        } finally {
          setSemanticLoading(false);
        }
      } else {
        loadItems(activeTab, trimmed);
      }
    } else {
      loadItems(activeTab);
    }
  };

  const handleSearchCancel = () => {
    setSearchMode(false);
  };

  // Render the left-pane list based on active tab
  const renderList = () => {
    // Date tree for tweets tab (non-search mode)
    if (treeActive) {
      return (
        <DateTree
          rows={dateTree.visibleRows}
          cursorIndex={dateTree.cursorIndex}
          scrollOffset={dateTree.scrollOffset}
          totalRows={dateTree.rows.length}
          width={leftWidth}
          tweetCount={archive.getTweetCount()}
        />
      );
    }

    // Flat list for all other cases
    if (items.length === 0) {
      return (
        <Box paddingX={1} paddingY={1}>
          <Text color={MUTED_COLOR}>
            {searchQuery ? `No results for "${searchQuery}"` : "No items"}
          </Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        {visible.map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Box key={getItemKey(item, activeTab)}>
              <Text color={isSelected ? BRAND_COLOR : undefined}>
                {isSelected ? "▸ " : "  "}
              </Text>
              {renderListItem(item, activeTab, leftWidth - 3)}
            </Box>
          );
        })}
        <Box marginTop={1} paddingX={1} justifyContent="space-between">
          <Text color={MUTED_COLOR}>
            {items.length} {activeTab}
          </Text>
          {totalPages > 1 && (
            <Text color={BRAND_COLOR}>
              {page + 1}/{totalPages}
            </Text>
          )}
        </Box>
      </Box>
    );
  };

  // Render the right pane
  const renderRightPane = () => {
    if (treeActive && dayTweets.length > 0) {
      return (
        <TweetListPane
          tweets={dayTweets}
          selectedIndex={dayTweetIndex}
          width={rightWidth}
          height={paneHeight}
          focused={focus === "tweets"}
        />
      );
    }
    if (treeActive && !dateTree.selectedDay) {
      return (
        <Box paddingX={1} paddingY={1}>
          <Text color={MUTED_COLOR}>Select a day to view tweets</Text>
        </Box>
      );
    }
    if (treeActive && dateTree.selectedDay && dayTweets.length === 0) {
      return (
        <Box paddingX={1} paddingY={1}>
          <Text color={MUTED_COLOR}>No tweets on this day</Text>
        </Box>
      );
    }
    return (
      <DetailPane
        tab={activeTab}
        item={selectedItem}
        width={rightWidth}
      />
    );
  };

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Header title="Browse Archive" />
      <Box marginTop={1}>
        <TabBar tabs={tabs} activeIndex={activeTabIndex} />
      </Box>

      {searchMode ? (
        <Box marginY={1} paddingX={1}>
          <Text color={BRAND_COLOR}>/ </Text>
          {semanticMode && (activeTab === "tweets" || activeTab === "likes") && (
            <Text color="#9b59b6" bold>[Semantic] </Text>
          )}
          <TextInput
            placeholder={semanticMode && (activeTab === "tweets" || activeTab === "likes") ? "Semantic search..." : `Search ${activeTab}...`}
            onSubmit={handleSearchSubmit}
          />
        </Box>
      ) : searchQuery ? (
        <Box paddingX={1}>
          <Text color={MUTED_COLOR}>
            {semanticMode && (activeTab === "tweets" || activeTab === "likes") && <Text color="#9b59b6" bold>[Semantic] </Text>}
            Search: "<Text bold>{searchQuery}</Text>" (esc to clear)
          </Text>
          {semanticLoading && <Text color={MUTED_COLOR}> searching...</Text>}
        </Box>
      ) : semanticMode && (activeTab === "tweets" || activeTab === "likes") ? (
        <Box paddingX={1}>
          <Text color="#9b59b6" bold>[Semantic]</Text>
          <Text color={MUTED_COLOR}> mode active — / to search by meaning</Text>
        </Box>
      ) : null}

      {confirmDelete && (
        <Box paddingX={1}>
          <Text color={ERROR_COLOR}>
            Delete tweet {confirmDelete}? This cannot be undone. (y/n)
          </Text>
        </Box>
      )}
      {deleteStatus === "deleting" && (
        <Box paddingX={1}>
          <Text color={MUTED_COLOR}>Deleting...</Text>
        </Box>
      )}
      {deleteStatus === "done" && (
        <Box paddingX={1}>
          <Text color={SUCCESS_COLOR}>Deleted.</Text>
        </Box>
      )}
      {deleteStatus === "error" && (
        <Box paddingX={1}>
          <Text color={ERROR_COLOR}>Delete failed: {deleteError ?? "unknown error"}</Text>
        </Box>
      )}
      {refreshStatus === "refreshing" && (
        <Box paddingX={1}>
          <Text color={MUTED_COLOR}>Refreshing metrics... </Text>
          <CostBadge endpoint="tweets/lookup" />
        </Box>
      )}
      {refreshStatus === "done" && (
        <Box paddingX={1}>
          <Text color={SUCCESS_COLOR}>Metrics updated.</Text>
        </Box>
      )}
      {refreshStatus === "error" && (
        <Box paddingX={1}>
          <Text color={ERROR_COLOR}>Failed to refresh metrics.</Text>
        </Box>
      )}

      <SplitPane
        width={width}
        height={paneHeight}
        leftWidth={leftWidth}
        left={renderList()}
        right={renderRightPane()}
      />

      <Footer
        hints={
          confirmDelete
            ? ["y: confirm delete", "n/esc: cancel"]
            : focus === "tweets"
              ? [
                  "j/k: navigate tweets",
                  "o: open",
                  "d: delete",
                  "r: refresh metrics",
                  "esc: back to tree",
                ]
              : treeActive
                ? [
                    "j/k: navigate",
                    "enter: view day / expand",
                    "h/l/tab: switch tab",
                    "/: search",
                    "?: semantic",
                    "esc: back",
                  ]
                : ["j/k: navigate", "h/l/tab: switch tab", "/: search", "?: semantic", "esc: back"]
        }
      />
    </Box>
  );
}

function getItemKey(item: AnyItem, tab: BrowseTab): string {
  switch (tab) {
    case "tweets":
      return (item as StoredTweet).id;
    case "likes":
      return (item as StoredLike).tweetId;
    default:
      return (item as { accountId: string }).accountId;
  }
}

function renderListItem(item: AnyItem, tab: BrowseTab, maxWidth: number): React.ReactNode {
  switch (tab) {
    case "tweets": {
      const tweet = item as StoredTweet;
      const dateStr = formatDate(tweet.createdAt);
      const textWidth = Math.max(10, maxWidth - dateStr.length - 1);
      return (
        <>
          <Text color={MUTED_COLOR}>{dateStr} </Text>
          <Text>{truncate(tweet.fullText.replace(/\n/g, " "), textWidth)}</Text>
          {tweet.deleted && <Text color={ERROR_COLOR}> ✗</Text>}
        </>
      );
    }
    case "likes": {
      const like = item as StoredLike;
      return <Text>{truncate(like.fullText.replace(/\n/g, " "), maxWidth)}</Text>;
    }
    default: {
      const user = item as { accountId: string; userLink: string };
      // Extract username from userLink (e.g., "https://x.com/username" → "@username")
      const match = user.userLink.match(/\/([^/]+)$/);
      const display = match ? `@${match[1]}` : user.accountId;
      return <Text>{truncate(display, maxWidth)}</Text>;
    }
  }
}
