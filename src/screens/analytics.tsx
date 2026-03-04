import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { Header } from "../components/header.js";
import { Footer } from "../components/footer.js";
import { TabBar, type Tab } from "../components/tab-bar.js";
import { BarChart } from "../components/bar-chart.js";
import { Sparkline } from "../components/sparkline.js";
import { StatGrid } from "../components/stat-grid.js";
import { TweetCard } from "../components/tweet-card.js";
import { useTerminalSize } from "../hooks/use-terminal-size.js";
import type { AnalyticsTab } from "../types.js";
import { BRAND_COLOR, MUTED_COLOR, ERROR_COLOR, SUCCESS_COLOR, WARNING_COLOR } from "../utils/constants.js";
import { formatNumber } from "../utils/format.js";

const TAB_KEYS: AnalyticsTab[] = ["overview", "activity", "engagement", "ads", "privacy"];
const TAB_LABELS: Record<AnalyticsTab, string> = {
  overview: "Overview",
  activity: "Activity",
  engagement: "Engagement",
  ads: "Ads",
  privacy: "Privacy",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

// Chrome = header (3) + tab bar (2) + footer (2) + margins
const CHROME_ROWS = 8;

interface AnalyticsScreenProps {
  archive: ReturnType<typeof import("../hooks/use-archive.js").useArchive>;
  onBack: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={BRAND_COLOR}>{title}</Text>
      <Box flexDirection="column" paddingLeft={1}>{children}</Box>
    </Box>
  );
}

export function AnalyticsScreen({ archive, onBack }: AnalyticsScreenProps) {
  const { width, height } = useTerminalSize();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const activeTab = TAB_KEYS[activeTabIndex]!;
  const contentHeight = Math.max(5, height - CHROME_ROWS);
  const halfPage = Math.max(1, Math.floor(contentHeight / 2));
  const chartWidth = Math.min(width - 4, 80);

  // Load data once per render (synchronous SQLite)
  const data = useMemo(() => {
    const stats = archive.getStats();
    const yearlyCounts = archive.getYearlyCounts();
    const latestYear = yearlyCounts.length > 0 ? yearlyCounts[yearlyCounts.length - 1]!.year : null;
    const monthlyCounts = latestYear ? archive.getMonthlyCountsForYear(latestYear) : [];
    const hourly = archive.getHourlyDistribution();
    const dayOfWeek = archive.getDayOfWeekDistribution();
    const topByLikes = archive.getTopTweetsByLikes(5);
    const topByRetweets = archive.getTopTweetsByRetweets(5);
    const engDist = archive.getEngagementDistribution();
    const avgByType = archive.getAvgEngagementByType();
    const topAdvertisers = archive.getTopAdvertisers(10);
    const topTargeting = archive.getTopTargetingTypes(10);
    const deviceBreakdown = archive.getAdDeviceBreakdown();
    const ipSummary = archive.getIpAuditSummary();
    const connectedApps = archive.getConnectedApps(50);
    const interests = archive.getInterests(100);

    return {
      stats,
      yearlyCounts,
      latestYear,
      monthlyCounts,
      hourly,
      dayOfWeek,
      topByLikes,
      topByRetweets,
      engDist,
      avgByType,
      topAdvertisers,
      topTargeting,
      deviceBreakdown,
      ipSummary,
      connectedApps,
      interests,
    };
  }, [archive, activeTabIndex]);

  const tabs: Tab[] = TAB_KEYS.map((key) => ({
    label: TAB_LABELS[key],
    count: 0,
  }));

  // Reset scroll when tab changes
  const switchTab = (index: number) => {
    setActiveTabIndex(index);
    setScrollOffset(0);
  };

  useInput((input, key) => {
    // Tab switching
    if (key.tab || input === "l") {
      switchTab((activeTabIndex + 1) % TAB_KEYS.length);
    }
    if (input === "h") {
      switchTab((activeTabIndex - 1 + TAB_KEYS.length) % TAB_KEYS.length);
    }

    // Scrolling
    if (input === "j" || key.downArrow) {
      setScrollOffset((s) => s + 1);
    }
    if (input === "k" || key.upArrow) {
      setScrollOffset((s) => Math.max(0, s - 1));
    }
    if (input === "J") {
      setScrollOffset((s) => s + halfPage);
    }
    if (input === "K") {
      setScrollOffset((s) => Math.max(0, s - halfPage));
    }
    if (input === "g") {
      setScrollOffset(0);
    }
    if (input === "G") {
      setScrollOffset(999);
    }

    // Back
    if (key.escape) {
      onBack();
    }
  });

  const renderOverview = () => {
    const { stats, yearlyCounts, monthlyCounts, topByLikes } = data;
    const replyRate = stats.total > 0 ? ((stats.replies / stats.total) * 100).toFixed(1) : "0";
    const rtRate = stats.total > 0 ? ((stats.retweets / stats.total) * 100).toFixed(1) : "0";
    const avgLikes = stats.active > 0
      ? (data.topByLikes.reduce((s, t) => s + t.favoriteCount, 0) / Math.min(data.topByLikes.length, stats.active)).toFixed(1)
      : "0";
    const followerRatio = stats.following > 0
      ? (stats.followers / stats.following).toFixed(2)
      : stats.followers.toString();

    return (
      <Box flexDirection="column">
        <Section title="Account Summary">
          <StatGrid
            width={chartWidth}
            stats={[
              { label: "Total Tweets", value: formatNumber(stats.total) },
              { label: "Active Tweets", value: formatNumber(stats.active) },
              { label: "Followers", value: formatNumber(stats.followers) },
              { label: "Following", value: formatNumber(stats.following) },
              { label: "Follower Ratio", value: followerRatio },
              { label: "Reply Rate", value: `${replyRate}%` },
              { label: "RT Rate", value: `${rtRate}%` },
              { label: "Likes Given", value: formatNumber(stats.likes) },
            ]}
          />
        </Section>

        {yearlyCounts.length > 0 && (
          <Section title="Tweets by Year">
            <BarChart
              data={yearlyCounts.map((y) => ({ label: y.year, value: y.count }))}
              width={chartWidth}
            />
          </Section>
        )}

        {monthlyCounts.length > 0 && (
          <Section title={`Monthly Activity (${data.latestYear})`}>
            <Sparkline
              data={fillMonths(monthlyCounts)}
              labels={MONTH_SHORT}
              showMinMax
            />
          </Section>
        )}

        {topByLikes.length > 0 && (
          <Section title="Top Tweet">
            <TweetCard tweet={topByLikes[0]!} width={chartWidth} />
          </Section>
        )}
      </Box>
    );
  };

  const renderActivity = () => {
    const { yearlyCounts, monthlyCounts, hourly, dayOfWeek } = data;

    return (
      <Box flexDirection="column">
        {yearlyCounts.length > 0 ? (
          <Section title="Tweets by Year">
            <BarChart
              data={yearlyCounts.map((y) => ({ label: y.year, value: y.count }))}
              width={chartWidth}
            />
          </Section>
        ) : (
          <Section title="Tweets by Year">
            <Text color={MUTED_COLOR}>No tweet data</Text>
          </Section>
        )}

        {monthlyCounts.length > 0 && (
          <Section title={`Monthly Activity (${data.latestYear})`}>
            <Sparkline
              data={fillMonths(monthlyCounts)}
              labels={MONTH_SHORT}
              showMinMax
            />
          </Section>
        )}

        {hourly.length > 0 ? (
          <Section title="Hour of Day (UTC)">
            <BarChart
              data={fillHours(hourly).map((h) => ({
                label: String(h.hour).padStart(2, "0"),
                value: h.count,
              }))}
              width={chartWidth}
              barColor={SUCCESS_COLOR}
            />
          </Section>
        ) : (
          <Section title="Hour of Day">
            <Text color={MUTED_COLOR}>No tweet data</Text>
          </Section>
        )}

        {dayOfWeek.length > 0 ? (
          <Section title="Day of Week">
            <BarChart
              data={fillDaysOfWeek(dayOfWeek).map((d) => ({
                label: DAY_NAMES[d.day] ?? String(d.day),
                value: d.count,
              }))}
              width={chartWidth}
              barColor={WARNING_COLOR}
            />
          </Section>
        ) : (
          <Section title="Day of Week">
            <Text color={MUTED_COLOR}>No tweet data</Text>
          </Section>
        )}
      </Box>
    );
  };

  const renderEngagement = () => {
    const { engDist, avgByType, topByLikes, topByRetweets } = data;

    return (
      <Box flexDirection="column">
        {engDist.length > 0 ? (
          <Section title="Engagement Distribution">
            <BarChart
              data={engDist.map((d) => ({ label: d.bucket, value: d.count }))}
              width={chartWidth}
            />
          </Section>
        ) : (
          <Section title="Engagement Distribution">
            <Text color={MUTED_COLOR}>No engagement data</Text>
          </Section>
        )}

        {avgByType.length > 0 && (
          <Section title="Average Engagement by Type">
            <Box flexDirection="column">
              <Box>
                <Text color={MUTED_COLOR}>{"Type".padEnd(12)}</Text>
                <Text color={MUTED_COLOR}>{"Avg ♥".padEnd(10)}</Text>
                <Text color={MUTED_COLOR}>{"Avg ↻".padEnd(10)}</Text>
                <Text color={MUTED_COLOR}>Count</Text>
              </Box>
              <Text color={MUTED_COLOR}>{"─".repeat(Math.min(45, chartWidth))}</Text>
              {avgByType.map((row) => (
                <Box key={row.type}>
                  <Text bold>{row.type.padEnd(12)}</Text>
                  <Text color={ERROR_COLOR}>{String(row.avgLikes).padEnd(10)}</Text>
                  <Text color={BRAND_COLOR}>{String(row.avgRetweets).padEnd(10)}</Text>
                  <Text color={MUTED_COLOR}>{formatNumber(row.count)}</Text>
                </Box>
              ))}
            </Box>
          </Section>
        )}

        {topByLikes.length > 0 && (
          <Section title="Top 5 by Likes">
            {topByLikes.map((t) => (
              <TweetCard key={t.id} tweet={t} compact maxWidth={chartWidth} />
            ))}
          </Section>
        )}

        {topByRetweets.length > 0 && (
          <Section title="Top 5 by Retweets">
            {topByRetweets.map((t) => (
              <TweetCard key={t.id} tweet={t} compact maxWidth={chartWidth} />
            ))}
          </Section>
        )}
      </Box>
    );
  };

  const renderAds = () => {
    const { stats, topAdvertisers, topTargeting, deviceBreakdown } = data;

    return (
      <Box flexDirection="column">
        <Section title="Ad Summary">
          <StatGrid
            width={chartWidth}
            stats={[
              { label: "Ad Engagements", value: formatNumber(stats.adEngagements) },
              { label: "Ad Impressions", value: formatNumber(stats.adImpressions) },
            ]}
          />
        </Section>

        {topAdvertisers.length > 0 ? (
          <Section title="Top Advertisers">
            <BarChart
              data={topAdvertisers.map((a) => ({
                label: a.advertiserName.slice(0, 20),
                value: a.engagements + a.impressions,
              }))}
              width={chartWidth}
              barColor={WARNING_COLOR}
            />
          </Section>
        ) : (
          <Section title="Top Advertisers">
            <Text color={MUTED_COLOR}>No ad data</Text>
          </Section>
        )}

        {topTargeting.length > 0 ? (
          <Section title="Targeting Categories">
            <BarChart
              data={topTargeting.map((t) => ({
                label: t.targetingType.slice(0, 20),
                value: t.count,
              }))}
              width={chartWidth}
              barColor={ERROR_COLOR}
            />
          </Section>
        ) : (
          <Section title="Targeting Categories">
            <Text color={MUTED_COLOR}>No targeting data</Text>
          </Section>
        )}

        {deviceBreakdown.length > 0 ? (
          <Section title="Device / OS">
            <BarChart
              data={deviceBreakdown.map((d) => ({
                label: d.osType || "Unknown",
                value: d.count,
              }))}
              width={chartWidth}
              barColor={SUCCESS_COLOR}
            />
          </Section>
        ) : (
          <Section title="Device / OS">
            <Text color={MUTED_COLOR}>No device data</Text>
          </Section>
        )}
      </Box>
    );
  };

  const renderPrivacy = () => {
    const { stats, ipSummary, connectedApps, interests } = data;

    return (
      <Box flexDirection="column">
        <Section title="Privacy Summary">
          <StatGrid
            width={chartWidth}
            stats={[
              { label: "Unique IPs", value: formatNumber(ipSummary.uniqueIps) },
              { label: "Total Logins", value: formatNumber(ipSummary.totalLogins) },
              { label: "Connected Apps", value: formatNumber(stats.connectedApps) },
              { label: "Device Tokens", value: formatNumber(stats.deviceTokens) },
            ]}
          />
        </Section>

        {ipSummary.topIps.length > 0 ? (
          <Section title="Top Login IPs">
            <BarChart
              data={ipSummary.topIps.map((ip) => ({
                label: ip.ip,
                value: ip.count,
              }))}
              width={chartWidth}
              barColor={ERROR_COLOR}
            />
          </Section>
        ) : (
          <Section title="Top Login IPs">
            <Text color={MUTED_COLOR}>No IP audit data</Text>
          </Section>
        )}

        {connectedApps.length > 0 && (
          <Section title="Connected Apps">
            <Box flexDirection="column">
              {connectedApps.map((app) => (
                <Box key={app.id}>
                  <Text color={BRAND_COLOR}>• </Text>
                  <Text bold>{app.name}</Text>
                  {app.orgName ? <Text color={MUTED_COLOR}> ({app.orgName})</Text> : null}
                </Box>
              ))}
            </Box>
          </Section>
        )}

        {interests.length > 0 && (
          <Section title={`Inferred Interests (${interests.length})`}>
            <Text wrap="wrap" color={MUTED_COLOR}>
              {interests.map((i) => i.name).join(" · ")}
            </Text>
          </Section>
        )}
      </Box>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview": return renderOverview();
      case "activity": return renderActivity();
      case "engagement": return renderEngagement();
      case "ads": return renderAds();
      case "privacy": return renderPrivacy();
    }
  };

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Header title="Analytics" />
      <Box marginTop={1}>
        <TabBar tabs={tabs} activeIndex={activeTabIndex} />
      </Box>

      <Box height={contentHeight} overflowY="hidden">
        <Box flexDirection="column" marginTop={-scrollOffset} paddingX={1}>
          {renderContent()}
        </Box>
      </Box>

      <Footer
        hints={["j/k: scroll", "J/K: half page", "g/G: top/bottom", "h/l/tab: switch tab", "esc: back"]}
      />
    </Box>
  );
}

// Fill in missing months (1-12) with count 0
function fillMonths(data: { month: number; count: number }[]): number[] {
  const map = new Map(data.map((d) => [d.month, d.count]));
  return Array.from({ length: 12 }, (_, i) => map.get(i + 1) ?? 0);
}

// Fill in missing hours (0-23) with count 0
function fillHours(data: { hour: number; count: number }[]): { hour: number; count: number }[] {
  const map = new Map(data.map((d) => [d.hour, d.count]));
  return Array.from({ length: 24 }, (_, i) => ({ hour: i, count: map.get(i) ?? 0 }));
}

// Fill in missing days (0-6) with count 0
function fillDaysOfWeek(data: { day: number; count: number }[]): { day: number; count: number }[] {
  const map = new Map(data.map((d) => [d.day, d.count]));
  return Array.from({ length: 7 }, (_, i) => ({ day: i, count: map.get(i) ?? 0 }));
}
