/**
 * Morning Brief screen — shows the day's agent-generated ideas and queued drafts.
 */
import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/store/auth";
import { api } from "@/lib/api";

export default function BriefScreen() {
  const session = useSession();

  // Show today's pending tasks that are awaiting approval (draft posts, etc.)
  const tasksQuery = useQuery({
    queryKey: ["tasks", "brief"],
    queryFn: () => api.agents.getTasks(session!, { status: "awaiting_approval", limit: 20 }),
    enabled: !!session,
    refetchInterval: 30_000,
  });

  const tasks = tasksQuery.data?.data ?? [];
  const briefs = tasks.filter((t) => t.agentType === "growth" || t.agentType === "content");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={tasksQuery.isFetching}
          onRefresh={() => tasksQuery.refetch()}
          tintColor="#7c3aed"
        />
      }
    >
      <Text style={styles.date}>{today}</Text>
      <Text style={styles.heading}>Morning Brief</Text>
      <Text style={styles.sub}>Content ideas and drafts waiting for your review</Text>

      {tasksQuery.isLoading ? (
        <ActivityIndicator color="#7c3aed" style={{ marginTop: 40 }} />
      ) : briefs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>☀️</Text>
          <Text style={styles.emptyTitle}>Nothing scheduled yet</Text>
          <Text style={styles.emptySubtitle}>
            The Morning Brief agent will drop ideas here each morning
          </Text>
        </View>
      ) : (
        briefs.map((task) => (
          <View key={task.id} style={styles.briefCard}>
            <View style={styles.briefHeader}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{task.agentType}</Text>
              </View>
            </View>
            <Text style={styles.briefTitle}>{task.title}</Text>
            <Text style={styles.briefTime}>
              Created {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  content: { padding: 20, paddingBottom: 40 },
  date: { fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  heading: { fontSize: 26, fontWeight: "700", color: "#ffffff", marginBottom: 6 },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 28 },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#e5e7eb", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: "#6b7280", textAlign: "center", paddingHorizontal: 20 },
  briefCard: {
    backgroundColor: "#111118",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1f1f2e",
  },
  briefHeader: { flexDirection: "row", marginBottom: 10 },
  typeBadge: {
    backgroundColor: "#7c3aed22",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  typeText: { color: "#a78bfa", fontSize: 11, fontWeight: "600" },
  briefTitle: { fontSize: 15, fontWeight: "600", color: "#f3f4f6", marginBottom: 6, lineHeight: 22 },
  briefTime: { fontSize: 12, color: "#6b7280" },
});
