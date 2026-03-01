import React, { useEffect, useState } from "react";
import { Box, useApp, useInput } from "ink";
import { useNavigation } from "./hooks/use-navigation.js";
import { useTwitter } from "./hooks/use-twitter.js";
import { useArchive } from "./hooks/use-archive.js";
import { hasCredentials } from "./config.js";

// Screens
import { MainMenu } from "./screens/main-menu.js";
import { SetupScreen } from "./screens/setup.js";
import { ProfileScreen } from "./screens/profile.js";
import { PostTweetScreen } from "./screens/post-tweet.js";
import { DeleteTweetScreen } from "./screens/delete-tweet.js";
import { ImportArchiveScreen } from "./screens/import-archive.js";
import { ArchiveBrowserScreen } from "./screens/archive-browser.js";
import { BatchDeleteScreen } from "./screens/batch-delete.js";

export function App() {
  const { exit } = useApp();
  const { screen, navigate, goBack, canGoBack } = useNavigation(
    hasCredentials() ? "main-menu" : "setup"
  );
  const twitter = useTwitter();
  const archive = useArchive();
  const [archiveAvailable, setArchiveAvailable] = useState(false);

  // Initialize Twitter client on mount if credentials exist
  useEffect(() => {
    twitter.initialize();
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
    default:
      return <Box />;
  }
}
