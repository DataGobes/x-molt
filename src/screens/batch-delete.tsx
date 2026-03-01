import React, { useState, useRef, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput, Select, Spinner } from "@inkjs/ui";
import { Header } from "../components/header.js";
import { KeyHints } from "../components/footer.js";
import { ProgressTracker } from "../components/progress-tracker.js";
import { RateLimiter } from "../services/rate-limiter.js";
import type { StoredTweet, BatchDeleteFilter, DeleteProgress } from "../types.js";
import { formatDate, formatEta } from "../utils/format.js";
import { BRAND_COLOR, ERROR_COLOR, SUCCESS_COLOR, MUTED_COLOR, WARNING_COLOR, EFFECTIVE_DELETE_LIMIT } from "../utils/constants.js";

type Step = "filter" | "filter-before" | "filter-keyword" | "preview" | "confirm" | "deleting" | "done";

interface BatchDeleteProps {
  twitter: {
    deleteTweet: (id: string) => Promise<boolean>;
  };
  archive: {
    getFiltered: (filter: BatchDeleteFilter, limit?: number) => StoredTweet[];
    markDeleted: (id: string) => void;
    store: { isDeleted: (id: string) => boolean };
  };
  onBack: () => void;
}

export function BatchDeleteScreen({ twitter, archive, onBack }: BatchDeleteProps) {
  const [step, setStep] = useState<Step>("filter");
  const [filter, setFilter] = useState<BatchDeleteFilter>({
    includeReplies: true,
    includeRetweets: true,
  });
  const [preview, setPreview] = useState<StoredTweet[]>([]);
  const [progress, setProgress] = useState<DeleteProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    isPaused: false,
  });
  const abortRef = useRef<AbortController | null>(null);
  const pausedRef = useRef(false);

  useInput((input) => {
    if (input === "p" && step === "deleting") {
      pausedRef.current = !pausedRef.current;
      setProgress((prev) => ({ ...prev, isPaused: pausedRef.current }));
    }
    if (input === "c" && step === "deleting") {
      abortRef.current?.abort();
    }
  });

  const handleFilterDone = () => {
    const tweets = archive.getFiltered(filter);
    setPreview(tweets);
    setStep("preview");
  };

  const startDelete = useCallback(async () => {
    const tweets = preview;
    const total = tweets.length;
    const limiter = new RateLimiter();
    const controller = new AbortController();
    abortRef.current = controller;

    setProgress({
      total,
      completed: 0,
      failed: 0,
      skipped: 0,
      isPaused: false,
      estimatedTimeRemaining: Math.ceil(total / EFFECTIVE_DELETE_LIMIT) * 15 * 60,
    });
    setStep("deleting");

    let completed = 0;
    let failed = 0;
    let skipped = 0;

    for (const tweet of tweets) {
      if (controller.signal.aborted) break;

      // Pause loop
      while (pausedRef.current && !controller.signal.aborted) {
        await new Promise((r) => setTimeout(r, 500));
      }
      if (controller.signal.aborted) break;

      // Skip already deleted
      if (archive.store.isDeleted(tweet.id)) {
        skipped++;
        updateProgress(total, completed, failed, skipped);
        continue;
      }

      // Wait for rate limit slot
      const ready = await limiter.waitForSlot(controller.signal);
      if (!ready) break;

      try {
        const ok = await twitter.deleteTweet(tweet.id);
        limiter.record();
        if (ok) {
          archive.markDeleted(tweet.id);
          completed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      const done = completed + failed + skipped;
      const elapsed = done > 0 ? done : 1;
      const rate = elapsed / ((Date.now() - Date.now()) || 1); // simple ETA
      const remaining = total - done;
      const eta = remaining > 0
        ? Math.ceil(remaining / EFFECTIVE_DELETE_LIMIT) * 15 * 60
        : 0;

      updateProgress(total, completed, failed, skipped, tweet.id, eta);
    }

    setStep("done");

    function updateProgress(total: number, completed: number, failed: number, skipped: number, currentId?: string, eta?: number) {
      setProgress({
        total,
        completed,
        failed,
        skipped,
        currentTweetId: currentId,
        isPaused: pausedRef.current,
        estimatedTimeRemaining: eta,
      });
    }
  }, [preview, twitter, archive]);

  return (
    <Box flexDirection="column">
      <Header title="Batch Delete" />

      {step === "filter" && (
        <Box flexDirection="column">
          <Text bold>Configure delete filters:</Text>
          <Box marginTop={1} flexDirection="column">
            <Select
              options={[
                { label: "Delete tweets before a date", value: "before-date" },
                { label: "Delete tweets matching keyword", value: "keyword" },
                { label: `Include replies: ${filter.includeReplies ? "YES" : "NO"}`, value: "toggle-replies" },
                { label: `Include retweets: ${filter.includeRetweets ? "YES" : "NO"}`, value: "toggle-retweets" },
                { label: "Preview matching tweets →", value: "done" },
              ]}
              onChange={(value) => {
                if (value === "before-date") setStep("filter-before");
                else if (value === "keyword") setStep("filter-keyword");
                else if (value === "toggle-replies") {
                  setFilter((f) => ({ ...f, includeReplies: !f.includeReplies }));
                } else if (value === "toggle-retweets") {
                  setFilter((f) => ({ ...f, includeRetweets: !f.includeRetweets }));
                } else if (value === "done") handleFilterDone();
              }}
            />
          </Box>
          <Box marginTop={1} flexDirection="column">
            {filter.beforeDate && (
              <Text color={MUTED_COLOR}>Before: {formatDate(filter.beforeDate.toISOString())}</Text>
            )}
            {filter.keyword && (
              <Text color={MUTED_COLOR}>Keyword: "{filter.keyword}"</Text>
            )}
          </Box>
        </Box>
      )}

      {step === "filter-before" && (
        <Box flexDirection="column">
          <Text>Delete tweets before which date? (YYYY-MM-DD)</Text>
          <Box marginTop={1}>
            <Text color={BRAND_COLOR}>▸ </Text>
            <TextInput
              placeholder="2023-01-01"
              onSubmit={(value) => {
                const date = new Date(value.trim());
                if (!isNaN(date.getTime())) {
                  setFilter((f) => ({ ...f, beforeDate: date }));
                }
                setStep("filter");
              }}
            />
          </Box>
        </Box>
      )}

      {step === "filter-keyword" && (
        <Box flexDirection="column">
          <Text>Delete tweets containing keyword:</Text>
          <Box marginTop={1}>
            <Text color={BRAND_COLOR}>▸ </Text>
            <TextInput
              placeholder="search term..."
              onSubmit={(value) => {
                const kw = value.trim();
                if (kw.length > 0) {
                  setFilter((f) => ({ ...f, keyword: kw }));
                }
                setStep("filter");
              }}
            />
          </Box>
        </Box>
      )}

      {step === "preview" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color={WARNING_COLOR} bold>
              {preview.length} tweets match your filters
            </Text>
          </Box>
          {preview.length > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Text color={MUTED_COLOR}>Sample (first 5):</Text>
              {preview.slice(0, 5).map((t) => (
                <Box key={t.id}>
                  <Text color={MUTED_COLOR}>{formatDate(t.createdAt)} </Text>
                  <Text>{t.fullText.replace(/\n/g, " ").slice(0, 50)}...</Text>
                </Box>
              ))}
            </Box>
          )}
          <Box>
            <Text color={MUTED_COLOR}>
              Estimated time: ~{formatEta(Math.ceil(preview.length / EFFECTIVE_DELETE_LIMIT) * 15 * 60)}
              {" "}({EFFECTIVE_DELETE_LIMIT} deletes per 15-min window)
            </Text>
          </Box>
          <Box marginTop={1}>
            <Select
              options={[
                { label: "Start deleting", value: "start" },
                { label: "Adjust filters", value: "filter" },
                { label: "Cancel", value: "cancel" },
              ]}
              onChange={(value) => {
                if (value === "start") setStep("confirm");
                else if (value === "filter") setStep("filter");
                else onBack();
              }}
            />
          </Box>
        </Box>
      )}

      {step === "confirm" && (
        <Box flexDirection="column">
          <Text color={ERROR_COLOR} bold>
            ⚠ This will permanently delete {preview.length} tweets.
          </Text>
          <Text color={ERROR_COLOR}>This action cannot be undone.</Text>
          <Box marginTop={1}>
            <Select
              options={[
                { label: "Yes, delete them all", value: "confirm" },
                { label: "No, go back", value: "back" },
              ]}
              onChange={(value) => {
                if (value === "confirm") startDelete();
                else setStep("preview");
              }}
            />
          </Box>
        </Box>
      )}

      {step === "deleting" && (
        <Box flexDirection="column">
          <ProgressTracker progress={progress} />
          <Box marginTop={1} flexDirection="column">
            <Text color={MUTED_COLOR}>
              <Text bold>p</Text>: {progress.isPaused ? "resume" : "pause"}  │  <Text bold>c</Text>: cancel
            </Text>
            {progress.currentTweetId && (
              <Text color={MUTED_COLOR}>Current: {progress.currentTweetId}</Text>
            )}
          </Box>
        </Box>
      )}

      {step === "done" && (
        <Box flexDirection="column">
          <Text color={SUCCESS_COLOR} bold>Batch delete complete!</Text>
          <Box marginTop={1} flexDirection="column">
            <Text color={SUCCESS_COLOR}>✓ Deleted: {progress.completed}</Text>
            {progress.failed > 0 && (
              <Text color={ERROR_COLOR}>✗ Failed: {progress.failed}</Text>
            )}
            {progress.skipped > 0 && (
              <Text color={MUTED_COLOR}>⊘ Skipped (already deleted): {progress.skipped}</Text>
            )}
          </Box>
          <Box marginTop={1}>
            <Text color={MUTED_COLOR}>Press esc to go back.</Text>
          </Box>
        </Box>
      )}

      <KeyHints hints={step === "deleting" ? ["p: pause", "c: cancel"] : ["esc: back"]} showBack />
    </Box>
  );
}
