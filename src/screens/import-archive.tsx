import React, { useState } from "react";
import { Box, Text } from "ink";
import { TextInput, Spinner } from "@inkjs/ui";
import { Header } from "../components/header.js";
import { KeyHints } from "../components/footer.js";
import { loadArchive, archiveTweetToInsert } from "../services/archive-parser.js";
import { BRAND_COLOR, ERROR_COLOR, SUCCESS_COLOR, MUTED_COLOR } from "../utils/constants.js";

type Step = "input" | "importing" | "done";

interface ImportArchiveProps {
  archive: {
    store: {
      insertMany: (tweets: any[]) => number;
      getTweetCount: () => number;
    };
  };
  onBack: () => void;
}

export function ImportArchiveScreen({ archive, onBack }: ImportArchiveProps) {
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    parsed: number;
    imported: number;
    total: number;
  } | null>(null);

  const handleImport = async (filePath: string) => {
    setStep("importing");
    setError(null);

    try {
      const path = filePath.trim().replace(/^['"]|['"]$/g, ""); // strip quotes
      const tweets = loadArchive(path);
      const toInsert = tweets.map(archiveTweetToInsert);
      const imported = archive.store.insertMany(toInsert);
      const total = archive.store.getTweetCount();

      setImportResult({ parsed: tweets.length, imported, total });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import archive");
      setStep("input");
    }
  };

  return (
    <Box flexDirection="column">
      <Header title="Import Archive" />

      {error && (
        <Box marginBottom={1}>
          <Text color={ERROR_COLOR}>✗ {error}</Text>
        </Box>
      )}

      {step === "input" && (
        <Box flexDirection="column">
          <Text>Enter the path to your X data archive:</Text>
          <Text color={MUTED_COLOR}>
            Supports: tweets.js file or .zip archive
          </Text>
          <Text color={MUTED_COLOR}>
            Download at: https://x.com/settings/download_your_data
          </Text>
          <Box marginTop={1}>
            <Text color={BRAND_COLOR}>▸ </Text>
            <TextInput
              placeholder="/path/to/tweets.js or archive.zip"
              onSubmit={handleImport}
            />
          </Box>
        </Box>
      )}

      {step === "importing" && (
        <Box>
          <Spinner label="Parsing and importing tweets..." />
        </Box>
      )}

      {step === "done" && importResult && (
        <Box flexDirection="column">
          <Text color={SUCCESS_COLOR}>✓ Archive imported successfully!</Text>
          <Box marginTop={1} flexDirection="column">
            <Text>Parsed: <Text bold>{importResult.parsed.toLocaleString()}</Text> tweets</Text>
            <Text>Imported: <Text bold>{importResult.imported.toLocaleString()}</Text> new tweets</Text>
            <Text>Total in database: <Text bold>{importResult.total.toLocaleString()}</Text> tweets</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={MUTED_COLOR}>Press esc to go back. Browse and Batch Delete are now available.</Text>
          </Box>
        </Box>
      )}

      <KeyHints hints={["esc: back"]} showBack />
    </Box>
  );
}
