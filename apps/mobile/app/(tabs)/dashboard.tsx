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

export default function DashboardScreen() {
  const session = useSession();

  const liveQuery = useQuery({
    queryKey: ["stream", "live"],
    queryFn: () => api.stream.live(session!),
    enabled: !!session,
    refetchInterval: 20_000,
  });

  const approvalsQuery = useQuery({
    queryKey: ["approvals"],
    queryFn: () => api.agents.getApprovals(session!),
    enabled: !!session,
    refetchInterval: 15_000,
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", "recent"],
    queryFn: () => api.agents.getTasks(session!, { limit: 5 }),
    enabled: !!session,
  });

  const isRefreshing = liveQuery.isFetching || approvalsQuery.isFetching;

  const onRefresh = () => {
    liveQuery.refetch();
    approvalsQuery.refetch();
    tasksQuery.refetch();
  };

  const liveStream = liveQuery.data;
  const pendingApprovals = approvalsQuery.data?.meta.total ?? 0;
  const recentTasks = tasksQuery.data?.data ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#7c3aed"
        />
      }
    >
      <Text style={styles.greeting}>
        Hey {session?.user.name?.split(" ")[0] ?? "Creator"} 👋
      </Text>
      <Text style={styles.subGreeting}>Here's what's happening</Text>

      {/* Live indicator */}
      <View style={styles.row}>
        <StatCard
          label="Live Status"
          value={liveStream?.status === "live" ? "🔴 LIVE" : "Offline"}
          sub={liveStream?.status === "live" ? `${liveStream.viewerCount} viewers` : "No active stream"}
          accent={liveStream?.status === "live"}
        />
        <StatCard
          label="Pending Approvals"
          value={String(pendingApprovals)}
          sub="awaiting review"
          accent={pendingApprovals > 0}
        />
      </View>

      {/* Recent tasks */}
      <Text style={styles.sectionTitle}>Recent Tasks</Text>
      {tasksQuery.isLoading ? (
        <ActivityIndicator color="#7c3aed" style={{ marginTop: 16 }} />
      ) : recentTasks.length === 0 ? (
        <Text style={styles.empty}>No recent tasks</Text>
      ) : (
        recentTasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))
      )}
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function TaskRow({ task }: { task: { id: string; agentType: string; title: string; status: string; createdAt: string } }) {
  const statusColor: Record<string, string> = {
    completed: "#22c55e",
    failed: "#ef4444",
    running: "#f59e0b",
    awaiting_approval: "#7c3aed",
    queued: "#6b7280",
  };

  return (
    <View style={styles.taskRow}>
      <View style={styles.taskMeta}>
        <Text style={styles.taskAgent}>{task.agentType}</Text>
        <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: (statusColor[task.status] ?? "#6b7280") + "22" }]}>
        <Text style={[styles.statusText, { color: statusColor[task.status] ?? "#6b7280" }]}>
          {task.status.replace("_", " ")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 24, fontWeight: "700", color: "#ffffff", marginBottom: 4 },
  subGreeting: { fontSize: 14, color: "#6b7280", marginBottom: 24 },
  row: { flexDirection: "row", gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: "#111118",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f1f2e",
  },
  statCardAccent: { borderColor: "#7c3aed44" },
  statLabel: { fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: "700", color: "#ffffff", marginBottom: 4 },
  statValueAccent: { color: "#a78bfa" },
  statSub: { fontSize: 12, color: "#6b7280" },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#d1d5db", marginBottom: 12 },
  empty: { color: "#6b7280", fontSize: 14, textAlign: "center", marginTop: 16 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111118",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1f1f2e",
  },
  taskMeta: { flex: 1, marginRight: 12 },
  taskAgent: { fontSize: 11, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  taskTitle: { fontSize: 14, color: "#e5e7eb", fontWeight: "500" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: "600" },
});
