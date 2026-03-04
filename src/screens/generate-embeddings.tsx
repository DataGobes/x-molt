import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { FullScreen } from "../components/full-screen.js";
import { getEmbeddingEngine } from "../services/embeddings.js";
import type { EmbeddableType } from "../types.js";
import { BRAND_COLOR, MUTED_COLOR, SUCCESS_COLOR, WARNING_COLOR } from "../utils/constants.js";

type Step = "init" | "loading-model" | "generating" | "done" | "error";

const TYPE_LABELS: Record<EmbeddableType, string> = {
  tweets: "Tweets",
  likes: "Likes",
  dms: "DMs",
  grokChats: "Grok Chats",
  noteTweets: "Note Tweets",
};

const ALL_TYPES: EmbeddableType[] = ["tweets", "likes", "dms", "grokChats", "noteTweets"];

interface TypeProgress {
  total: number;
  embedded: number;
  status: "pending" | "generating" | "done" | "skipped";
}

interface GenerateEmbeddingsProps {
  archive: {
    store: {
      getEmbeddingStats: () => Record<EmbeddableType, { total: number; embedded: number }>;
      getVectorStore: (type?: EmbeddableType) => {
        getUnembeddedIds: (limit: number) => string[];
        getTextsForEmbedding: (ids: string[]) => Array<{ id: string; text: string }>;
        upsertBatch: (entries: Array<{ id: string; embedding: Float32Array }>) => void;
      };
    };
  };
  onBack: () => void;
}

export function GenerateEmbeddingsScreen({ archive, onBack }: GenerateEmbeddingsProps) {
  const [step, setStep] = useState<Step>("init");
  const [modelProgress, setModelProgress] = useState(0);
  const [typeProgress, setTypeProgress] = useState<Record<EmbeddableType, TypeProgress>>(() => {
    const initial = {} as Record<EmbeddableType, TypeProgress>;
    for (const type of ALL_TYPES) {
      initial[type] = { total: 0, embedded: 0, status: "pending" };
    }
    return initial;
  });
  const [currentType, setCurrentType] = useState<EmbeddableType | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  useInput((_input, key) => {
    if (key.escape) {
      if (step === "generating" || step === "loading-model") {
        abortRef.current = true;
      } else {
        onBack();
      }
    }
  });

  const generate = useCallback(async () => {
    try {
      // Get stats for all types
      const stats = archive.store.getEmbeddingStats();
      const progress = {} as Record<EmbeddableType, TypeProgress>;
      let anyRemaining = false;

      for (const type of ALL_TYPES) {
        const s = stats[type];
        const remaining = s.total - s.embedded;
        if (s.total === 0) {
          progress[type] = { total: s.total, embedded: s.embedded, status: "skipped" };
        } else if (remaining === 0) {
          progress[type] = { total: s.total, embedded: s.embedded, status: "done" };
        } else {
          progress[type] = { total: s.total, embedded: s.embedded, status: "pending" };
          anyRemaining = true;
        }
      }

      setTypeProgress(progress);

      if (!anyRemaining) {
        setStep("done");
        return;
      }

      // Load model
      setStep("loading-model");
      const engine = getEmbeddingEngine();
      await engine.init((p) => setModelProgress(p));

      if (abortRef.current) {
        setStep("done");
        return;
      }

      // Generate embeddings for each type sequentially
      setStep("generating");
      setStartTime(Date.now());
      let completed = 0;
      const batchSize = 32;

      for (const type of ALL_TYPES) {
        if (abortRef.current) break;
        if (progress[type].status !== "pending") continue;

        setCurrentType(type);
        setTypeProgress((prev) => ({
          ...prev,
          [type]: { ...prev[type], status: "generating" },
        }));

        const vs = archive.store.getVectorStore(type);

        while (!abortRef.current) {
          const ids = vs.getUnembeddedIds(batchSize);
          if (ids.length === 0) break;

          const texts = vs.getTextsForEmbedding(ids);
          if (texts.length === 0) break;

          const textStrings = texts.map((t) => t.text);
          const embeddings = await engine.embedBatch(textStrings);

          const entries = texts.map((t, i) => ({
            id: t.id,
            embedding: embeddings[i]!,
          }));
          vs.upsertBatch(entries);

          completed += texts.length;
          setTotalCompleted(completed);
          setTypeProgress((prev) => ({
            ...prev,
            [type]: {
              ...prev[type],
              embedded: prev[type].embedded + texts.length,
            },
          }));
        }

        if (!abortRef.current) {
          setTypeProgress((prev) => ({
            ...prev,
            [type]: { ...prev[type], status: "done" },
          }));
        }
      }

      setCurrentType(null);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }, [archive]);

  useEffect(() => {
    generate();
  }, [generate]);

  const elapsed = startTime > 0 ? (Date.now() - startTime) / 1000 : 0;
  const rate = elapsed > 0 && totalCompleted > 0 ? totalCompleted / elapsed : 0;

  // Calculate total remaining across all types
  const totalRemaining = ALL_TYPES.reduce((sum, type) => {
    const tp = typeProgress[type];
    return sum + Math.max(0, tp.total - tp.embedded);
  }, 0);
  const eta = rate > 0 ? Math.ceil(totalRemaining / rate) : 0;

  const barWidth = 25;

  const renderTypeBar = (type: EmbeddableType) => {
    const tp = typeProgress[type];
    const label = TYPE_LABELS[type].padEnd(12);

    if (tp.status === "skipped") {
      return (
        <Box key={type}>
          <Text color={MUTED_COLOR}>  {label}                                 —  no data</Text>
        </Box>
      );
    }

    if (tp.status === "done") {
      const filled = "\u2588".repeat(barWidth);
      return (
        <Box key={type}>
          <Text color={SUCCESS_COLOR}>  {label} {filled} 100%  </Text>
          <Text color={SUCCESS_COLOR}>\u2713 {tp.embedded.toLocaleString()}</Text>
        </Box>
      );
    }

    if (tp.status === "pending") {
      const empty = "\u2591".repeat(barWidth);
      return (
        <Box key={type}>
          <Text color={MUTED_COLOR}>  {label} {empty}   —  pending</Text>
        </Box>
      );
    }

    // generating
    const pct = tp.total > 0 ? tp.embedded / tp.total : 0;
    const filledCount = Math.round(pct * barWidth);
    const bar = "\u2588".repeat(filledCount) + "\u2591".repeat(barWidth - filledCount);
    const pctStr = `${Math.round(pct * 100)}%`.padStart(4);
    return (
      <Box key={type}>
        <Text color={BRAND_COLOR}>  {label} {bar} {pctStr}  </Text>
        <Text color={MUTED_COLOR}>({tp.embedded.toLocaleString()}/{tp.total.toLocaleString()})</Text>
      </Box>
    );
  };

  return (
    <FullScreen title="Generate Embeddings" hints={step === "done" || step === "error" ? ["esc: back"] : ["esc: cancel"]} showBack>
      {step === "init" && (
        <Text color={MUTED_COLOR}>Checking archive...</Text>
      )}

      {step === "loading-model" && (
        <Box flexDirection="column">
          <Text>Downloading embedding model...</Text>
          <Box>
            <Text color={BRAND_COLOR}>
              [{"\u2588".repeat(Math.round(modelProgress / 100 * barWidth))}{"\u2591".repeat(barWidth - Math.round(modelProgress / 100 * barWidth))}]
            </Text>
            <Text> {Math.round(modelProgress)}%</Text>
          </Box>
          <Text color={MUTED_COLOR}>First run downloads ~23MB model (cached after)</Text>
        </Box>
      )}

      {step === "generating" && (
        <Box flexDirection="column">
          <Text bold>Generate Embeddings</Text>
          <Box flexDirection="column" marginTop={1}>
            {ALL_TYPES.map(renderTypeBar)}
          </Box>
          {currentType && (
            <Box marginTop={1}>
              <Text color={MUTED_COLOR}>
                Currently: {TYPE_LABELS[currentType]}
                {rate > 0 && ` (${rate.toFixed(1)} items/sec`}
                {eta > 0 && `, ETA ~${eta < 60 ? `${eta}s` : `${Math.floor(eta / 60)}m ${eta % 60}s`}`}
                {rate > 0 && ")"}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {step === "done" && (
        <Box flexDirection="column">
          <Text bold>Generate Embeddings</Text>
          <Box flexDirection="column" marginTop={1}>
            {ALL_TYPES.map(renderTypeBar)}
          </Box>
          <Box marginTop={1}>
            {totalCompleted > 0 ? (
              <Text color={SUCCESS_COLOR} bold>
                {abortRef.current ? "Cancelled" : "Complete"}! Generated {totalCompleted.toLocaleString()} embeddings.
              </Text>
            ) : (
              <Text color={SUCCESS_COLOR}>All content already has embeddings!</Text>
            )}
          </Box>
          {abortRef.current && totalRemaining > 0 && (
            <Text color={WARNING_COLOR}>
              {totalRemaining.toLocaleString()} items remaining — run again to continue.
            </Text>
          )}
          <Box marginTop={1}>
            <Text color={MUTED_COLOR}>Semantic search is now available in Browse Archive (?)</Text>
          </Box>
        </Box>
      )}

      {step === "error" && (
        <Box flexDirection="column">
          <Text color="red" bold>Error generating embeddings</Text>
          <Text color="red">{error}</Text>
          <Box marginTop={1}>
            <Text color={MUTED_COLOR}>Press esc to go back. Progress has been saved.</Text>
          </Box>
        </Box>
      )}
    </FullScreen>
  );
}
