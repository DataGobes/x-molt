import React, { useEffect, useState } from "react";
import { Box, useApp, useInput } from "ink";
import { useNavigation } from "./hooks/use-navigation.js";
import { useTwitter } from "./hooks/use-twitter.js";
import { useArchive } from "./hooks/use-archive.js";
import { useCostTracker } from "./hooks/use-cost-tracker.js";
import { hasCredentials } from "./config.js";
import { setCostTracker } from "./services/twitter-client.js";

// Screens
import { MainMenu } from "./screens/main-menu.js";
import { SetupScreen } from "./screens/setup.js";
import { ProfileScreen } from "./screens/profile.js";
import { PostTweetScreen } from "./screens/post-tweet.js";
import { DeleteTweetScreen } from "./screens/delete-tweet.js";
import { ImportArchiveScreen } from "./screens/import-archive.js";
import { ArchiveBrowserScreen } from "./screens/archive-browser.js";
import { BatchDeleteScreen } from "./screens/batch-delete.js";
import { AnalyticsScreen } from "./screens/analytics.js";
import { CostDashboardScreen } from "./screens/cost-dashboard.js";
import { TimelineScreen } from "./screens/timeline.js";
import { SearchScreen } from "./screens/search.js";
import { BookmarksScreen } from "./screens/bookmarks.js";
import { SocialScreen } from "./screens/social.js";
import { ListsScreen } from "./screens/lists.js";
import { DmInboxScreen } from "./screens/dm-inbox.js";
import { GenerateEmbeddingsScreen } from "./screens/generate-embeddings.js";

export function App() {
  const { exit } = useApp();
  const { screen, navigate, goBack, canGoBack } = useNavigation(
    hasCredentials() ? "main-menu" : "setup"
  );
  const twitter = useTwitter();
  const archive = useArchive();
  const costTracker = useCostTracker();
  const [archiveAvailable, setArchiveAvailable] = useState(false);

  // Initialize Twitter client and cost tracker on mount
  useEffect(() => {
    twitter.initialize();
    setCostTracker(costTracker.tracker);
    setArchiveAvailable(archive.hasArchive());
  }, []);

  // Global key handlers
  useInput((input, key) => {
    if (input === "q" && screen === "main-menu") {
      exit();
    }
    if (key.escape && canGoBack) {
      goBack();
    }
  });

  const refreshArchiveStatus = () => {
    setArchiveAvailable(archive.hasArchive());
  };

  switch (screen) {
    case "setup":
      return (
        <SetupScreen
          twitter={twitter}
          onComplete={() => navigate("main-menu")}
        />
      );
    case "main-menu":
      return (
        <MainMenu
          navigate={navigate}
          hasArchive={archiveAvailable}
        />
      );
    case "profile":
      return (
        <ProfileScreen
          twitter={twitter}
          onBack={goBack}
        />
      );
    case "post-tweet":
      return (
        <PostTweetScreen
          twitter={twitter}
          archive={archive}
          onBack={goBack}
        />
      );
    case "delete-tweet":
      return (
        <DeleteTweetScreen
          twitter={twitter}
          onBack={goBack}
        />
      );
    case "import-archive":
      return (
        <ImportArchiveScreen
          archive={archive}
          onBack={() => {
            refreshArchiveStatus();
            goBack();
          }}
        />
      );
    case "archive-browser":
      return (
        <ArchiveBrowserScreen
          archive={archive}
          onBack={goBack}
        />
      );
    case "batch-delete":
      return (
        <BatchDeleteScreen
          twitter={twitter}
          archive={archive}
          onBack={goBack}
        />
      );
    case "analytics":
      return (
        <AnalyticsScreen
          archive={archive}
          onBack={goBack}
        />
      );
    case "cost-dashboard":
      return (
        <CostDashboardScreen
          costTracker={costTracker}
          twitter={{ getUsage: twitter.getUsage, isLoading: twitter.isLoading, error: twitter.error }}
          onBack={goBack}
        />
      );
    case "timeline":
      return (
        <TimelineScreen
          twitter={twitter}
          onBack={goBack}
        />
      );
    case "search":
      return (
        <SearchScreen
          twitter={twitter}
          onBack={goBack}
        />
      );
    case "bookmarks":
      return (
        <BookmarksScreen
          twitter={twitter}
          onBack={goBack}
        />
      );
    case "social":
      return (
        <SocialScreen
          twitter={twitter}
          onBack={goBack}
        />
      );
    case "lists":
      return (
        <ListsScreen
          twitter={twitter}
          onBack={goBack}
        />
      );
    case "dm-inbox":
      return (
        <DmInboxScreen
          twitter={twitter}
          onBack={goBack}
        />
      );
    case "generate-embeddings":
      return (
        <GenerateEmbeddingsScreen
          archive={archive}
          onBack={goBack}
        />
      );
    default:
      return <Box />;
  }
}
