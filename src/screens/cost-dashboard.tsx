import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { Spinner } from "@inkjs/ui";
import { FullScreen } from "../components/full-screen.js";
import { Sparkline } from "../components/sparkline.js";
import type { SpendByEndpoint, DailySpend } from "../services/cost-tracker.js";
import type { ApiUsageResult } from "../types.js";
import { BRAND_COLOR, MUTED_COLOR, COST_COLOR, SUCCESS_COLOR, ERROR_COLOR, WARNING_COLOR } from "../utils/constants.js";

interface CostDashboardProps {
  costTracker: {
    getSessionSpend: () => number;
    getDailySpend: () => number;
    getMonthlySpend: () => number;
    getTotalSpend: () => number;
    getSessionCallCount: () => number;
    getTotalCallCount: () => number;
    getSpendByEndpoint: (since?: number) => SpendByEndpoint[];
    getDailySpendHistory: (days?: number) => DailySpend[];
  };
  twitter: {
    getUsage: (days?: number) => Promise<ApiUsageResult | null>;
    isLoading: boolean;
    error: string | null;
  };
  onBack: () => void;
}

type Tab = "overview" | "endpoints" | "history" | "x-usage";

function formatDollars(amount: number): string {
  if (amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

export function CostDashboardScreen({ costTracker, twitter, onBack }: CostDashboardProps) {
  const [tab, setTab] = useState<Tab>("overview");

  useInput((input) => {
    if (input === "1") setTab("overview");
    if (input === "2") setTab("endpoints");
    if (input === "3") setTab("history");
    if (input === "4") setTab("x-usage");
  });

  const sessionSpend = costTracker.getSessionSpend();
  const dailySpend = costTracker.getDailySpend();
  const monthlySpend = costTracker.getMonthlySpend();
  const totalSpend = costTracker.getTotalSpend();
  const sessionCalls = costTracker.getSessionCallCount();
  const totalCalls = costTracker.getTotalCallCount();

  return (
    <FullScreen title="Cost Dashboard" hints={["1-4: tabs", "esc: back"]} showBack>
      {/* Tab bar */}
      <Box marginBottom={1} gap={2}>
        {(["overview", "endpoints", "history", "x-usage"] as Tab[]).map((t, i) => (
          <Text
            key={t}
            bold={tab === t}
            color={tab === t ? BRAND_COLOR : MUTED_COLOR}
            underline={tab === t}
          >
            [{i + 1}] {t.charAt(0).toUpperCase() + t.slice(1)}
          </Text>
        ))}
      </Box>

      {tab === "overview" && (
        <OverviewTab
          sessionSpend={sessionSpend}
          dailySpend={dailySpend}
          monthlySpend={monthlySpend}
          totalSpend={totalSpend}
          sessionCalls={sessionCalls}
          totalCalls={totalCalls}
        />
      )}

      {tab === "endpoints" && (
        <EndpointsTab costTracker={costTracker} />
      )}

      {tab === "history" && (
        <HistoryTab costTracker={costTracker} />
      )}

      {tab === "x-usage" && (
        <XUsageTab twitter={twitter} />
      )}
    </FullScreen>
  );
}

function OverviewTab({ sessionSpend, dailySpend, monthlySpend, totalSpend, sessionCalls, totalCalls }: {
  sessionSpend: number;
  dailySpend: number;
  monthlySpend: number;
  totalSpend: number;
  sessionCalls: number;
  totalCalls: number;
}) {
  return (
    <Box flexDirection="column">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        paddingX={2}
        paddingY={1}
      >
        <Text bold color={COST_COLOR}>Spend Summary</Text>
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color={MUTED_COLOR}>{"Session:     "}</Text>
            <Text bold>{formatDollars(sessionSpend)}</Text>
            <Text color={MUTED_COLOR}> ({sessionCalls} calls)</Text>
          </Box>
          <Box>
            <Text color={MUTED_COLOR}>{"Today:       "}</Text>
            <Text bold>{formatDollars(dailySpend)}</Text>
          </Box>
          <Box>
            <Text color={MUTED_COLOR}>{"This month:  "}</Text>
            <Text bold>{formatDollars(monthlySpend)}</Text>
          </Box>
          <Box>
            <Text color={MUTED_COLOR}>{"All time:    "}</Text>
            <Text bold>{formatDollars(totalSpend)}</Text>
            <Text color={MUTED_COLOR}> ({totalCalls} total calls)</Text>
          </Box>
        </Box>
      </Box>

      {totalCalls === 0 && (
        <Box marginTop={1}>
          <Text color={MUTED_COLOR}>No API calls recorded yet. Use x-molt features to see costs here.</Text>
        </Box>
      )}
    </Box>
  );
}

function EndpointsTab({ costTracker }: { costTracker: CostDashboardProps["costTracker"] }) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const endpoints = costTracker.getSpendByEndpoint(startOfMonth.getTime());

  if (endpoints.length === 0) {
    return (
      <Box>
        <Text color={MUTED_COLOR}>No API usage this month.</Text>
      </Box>
    );
  }

  // Table header
  const maxEndpoint = Math.max(20, ...endpoints.map((e) => e.endpoint.length));

  return (
    <Box flexDirection="column">
      <Text bold color={COST_COLOR}>This Month by Endpoint</Text>
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text bold color={MUTED_COLOR}>{"Endpoint".padEnd(maxEndpoint + 2)}</Text>
          <Text bold color={MUTED_COLOR}>{"Calls".padStart(8)}</Text>
          <Text bold color={MUTED_COLOR}>{"  Cost".padStart(10)}</Text>
        </Box>
        <Text color={MUTED_COLOR}>{"─".repeat(maxEndpoint + 20)}</Text>
        {endpoints.map((ep) => (
          <Box key={ep.endpoint}>
            <Text>{ep.endpoint.padEnd(maxEndpoint + 2)}</Text>
            <Text color={MUTED_COLOR}>{String(ep.count).padStart(8)}</Text>
            <Text color={COST_COLOR}>{formatDollars(ep.totalCost).padStart(10)}</Text>
          </Box>
        ))}
        <Text color={MUTED_COLOR}>{"─".repeat(maxEndpoint + 20)}</Text>
        <Box>
          <Text bold>{"Total".padEnd(maxEndpoint + 2)}</Text>
          <Text bold color={MUTED_COLOR}>{String(endpoints.reduce((s, e) => s + e.count, 0)).padStart(8)}</Text>
          <Text bold color={COST_COLOR}>{formatDollars(endpoints.reduce((s, e) => s + e.totalCost, 0)).padStart(10)}</Text>
        </Box>
      </Box>
    </Box>
  );
}

function HistoryTab({ costTracker }: { costTracker: CostDashboardProps["costTracker"] }) {
  const history = costTracker.getDailySpendHistory(30);

  if (history.length === 0) {
    return (
      <Box>
        <Text color={MUTED_COLOR}>No spend history yet.</Text>
      </Box>
    );
  }

  const costs = history.map((d) => d.totalCost);
  const labels = history.map((d) => d.date.slice(5)); // MM-DD

  return (
    <Box flexDirection="column">
      <Text bold color={COST_COLOR}>30-Day Spend History</Text>
      <Box marginTop={1}>
        <Sparkline data={costs} labels={labels} color={COST_COLOR} showMinMax />
      </Box>
      <Box marginTop={1} flexDirection="column">
        {history.slice(-7).reverse().map((d) => (
          <Box key={d.date}>
            <Text color={MUTED_COLOR}>{d.date}  </Text>
            <Text color={COST_COLOR}>{formatDollars(d.totalCost)}</Text>
            <Text color={MUTED_COLOR}> ({d.count} calls)</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function XUsageTab({ twitter }: { twitter: CostDashboardProps["twitter"] }) {
  const [usage, setUsage] = useState<ApiUsageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    twitter.getUsage(30).then((result) => {
      if (cancelled) return;
      if (result) {
        setUsage(result);
      } else {
        setError("Could not fetch usage from X API");
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Box>
        <Spinner label="Fetching usage from X API..." />
      </Box>
    );
  }

  if (error || !usage) {
    return (
      <Box flexDirection="column">
        <Text color={ERROR_COLOR}>{error ?? "Failed to load usage"}</Text>
        <Box marginTop={1}>
          <Text color={MUTED_COLOR}>This endpoint requires app-level Bearer Token auth.</Text>
        </Box>
      </Box>
    );
  }

  const usagePercent = usage.projectCap > 0 ? (usage.projectUsage / usage.projectCap * 100) : 0;
  const barWidth = 30;
  const filled = Math.round(barWidth * usagePercent / 100);
  const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);
  const barColor = usagePercent > 80 ? ERROR_COLOR : usagePercent > 50 ? WARNING_COLOR : SUCCESS_COLOR;

  return (
    <Box flexDirection="column">
      <Text bold color={COST_COLOR}>X API Usage (from /2/usage/tweets)</Text>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        paddingX={2}
        paddingY={1}
        marginTop={1}
      >
        <Box>
          <Text color={MUTED_COLOR}>{"Project:     "}</Text>
          <Text>{usage.projectId}</Text>
        </Box>
        <Box>
          <Text color={MUTED_COLOR}>{"Posts used:   "}</Text>
          <Text bold>{formatNumber(usage.projectUsage)}</Text>
          <Text color={MUTED_COLOR}> / {formatNumber(usage.projectCap)}</Text>
        </Box>
        <Box>
          <Text color={MUTED_COLOR}>{"Usage:       "}</Text>
          <Text color={barColor}>{bar}</Text>
          <Text color={MUTED_COLOR}> {usagePercent.toFixed(1)}%</Text>
        </Box>
        <Box>
          <Text color={MUTED_COLOR}>{"Cap resets:   "}</Text>
          <Text>{usage.capResetDay} days</Text>
        </Box>
      </Box>

      {usage.dailyUsage.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={COST_COLOR}>Daily Post Consumption (last 30d)</Text>
          <Box marginTop={1}>
            <Sparkline
              data={usage.dailyUsage.map((d) => d.usage)}
              labels={usage.dailyUsage.map((d) => d.date.slice(5))}
              color={COST_COLOR}
              showMinMax
            />
          </Box>
          <Box marginTop={1} flexDirection="column">
            {usage.dailyUsage.slice(-7).reverse().map((d) => (
              <Box key={d.date}>
                <Text color={MUTED_COLOR}>{d.date}  </Text>
                <Text color={COST_COLOR}>{formatNumber(d.usage)}</Text>
                <Text color={MUTED_COLOR}> posts consumed</Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
