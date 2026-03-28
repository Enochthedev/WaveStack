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

export default function StreamScreen() {
  const session = useSession();

  const liveQuery = useQuery({
    queryKey: ["stream", "live"],
    queryFn: () => api.stream.live(session!),
    enabled: !!session,
    refetchInterval: 20_000,
  });

  const historyQuery = useQuery({
    queryKey: ["stream", "list"],
    queryFn: () => api.stream.list(session!),
    enabled: !!session,
  });

  const live = liveQuery.data;
  const sessions = historyQuery.data?.data ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={liveQuery.isFetching || historyQuery.isFetching}
          onRefresh={() => { liveQuery.refetch(); historyQuery.refetch(); }}
          tintColor="#7c3aed"
        />
      }
    >
      {/* Live card */}
      {liveQuery.isLoading ? (
        <ActivityIndicator color="#7c3aed" style={{ marginVertical: 20 }} />
      ) : live ? (
        <View style={styles.liveCard}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>LIVE</Text>
          </View>
          <Text style={styles.liveTitle}>{live.title ?? "Active Stream"}</Text>
          <Text style={styles.liveMeta}>
            {live.viewerCount} viewers · {live.platform}
          </Text>
        </View>
      ) : (
        <View style={styles.offlineCard}>
          <Text style={styles.offlineTitle}>No active stream</Text>
          <Text style={styles.offlineSub}>Start streaming from the desktop app</Text>
        </View>
      )}

      {/* Session history */}
      <Text style={styles.sectionTitle}>Recent Sessions</Text>
      {historyQuery.isLoading ? (
        <ActivityIndicator color="#7c3aed" style={{ marginTop: 16 }} />
      ) : sessions.length === 0 ? (
        <Text style={styles.empty}>No stream history yet</Text>
      ) : (
        sessions.slice(0, 10).map((s) => (
          <View key={s.id} style={styles.sessionRow}>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionTitle}>{s.title ?? "Stream"}</Text>
              <Text style={styles.sessionMeta}>
                {new Date(s.startedAt).toLocaleDateString()} · {s.platform}
              </Text>
            </View>
            <Text style={styles.sessionViewers}>{s.viewerCount} viewers</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  content: { padding: 20, paddingBottom: 40 },
  liveCard: {
    backgroundColor: "#0d1a0d",
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#14532d",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    alignSelf: "flex-start",
    backgroundColor: "#14532d",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  livePillText: { color: "#22c55e", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  liveTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff", marginBottom: 6 },
  liveMeta: { fontSize: 13, color: "#86efac" },
  offlineCard: {
    backgroundColor: "#111118",
    borderRadius: 14,
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1f1f2e",
  },
  offlineTitle: { fontSize: 16, fontWeight: "600", color: "#9ca3af", marginBottom: 6 },
  offlineSub: { fontSize: 13, color: "#6b7280" },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#d1d5db", marginBottom: 12 },
  empty: { color: "#6b7280", fontSize: 14, textAlign: "center" },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111118",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1f1f2e",
  },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 14, fontWeight: "600", color: "#e5e7eb", marginBottom: 3 },
  sessionMeta: { fontSize: 12, color: "#6b7280" },
  sessionViewers: { fontSize: 13, color: "#9ca3af" },
});
