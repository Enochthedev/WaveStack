/**
 * Approval cards screen — the core "Pocket Jarvis" UX.
 * Shows pending approval requests with approve/reject actions.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/store/auth";
import { api, type ApprovalRequest } from "@/lib/api";

const URGENCY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

export default function ApprovalsScreen() {
  const session = useSession();
  const qc = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["approvals"],
    queryFn: () => api.agents.getApprovals(session!),
    enabled: !!session,
    refetchInterval: 15_000,
  });

  const actMutation = useMutation({
    mutationFn: ({
      id,
      action,
      feedback,
    }: {
      id: string;
      action: "approve" | "reject";
      feedback?: string;
    }) => api.agents.actOnApproval(session!, id, action, feedback),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
    },
  });

  const [rejectModal, setRejectModal] = useState<{ id: string; title: string } | null>(null);
  const [feedback, setFeedback] = useState("");

  const handleApprove = (approval: ApprovalRequest) => {
    Alert.alert("Approve", `Approve "${approval.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        style: "default",
        onPress: () => actMutation.mutate({ id: approval.id, action: "approve" }),
      },
    ]);
  };

  const handleReject = (approval: ApprovalRequest) => {
    setFeedback("");
    setRejectModal({ id: approval.id, title: approval.title });
  };

  const confirmReject = () => {
    if (!rejectModal) return;
    actMutation.mutate({ id: rejectModal.id, action: "reject", feedback });
    setRejectModal(null);
  };

  const approvals = data?.data ?? [];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor="#7c3aed"
          />
        }
      >
        <Text style={styles.count}>
          {approvals.length} pending{approvals.length !== 1 ? " approvals" : " approval"}
        </Text>

        {isLoading ? (
          <ActivityIndicator color="#7c3aed" style={{ marginTop: 40 }} />
        ) : approvals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>All clear</Text>
            <Text style={styles.emptySubtitle}>No pending approvals right now</Text>
          </View>
        ) : (
          approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={() => handleApprove(approval)}
              onReject={() => handleReject(approval)}
              pending={actMutation.isPending && actMutation.variables?.id === approval.id}
            />
          ))
        )}
      </ScrollView>

      {/* Reject feedback modal */}
      <Modal
        visible={!!rejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Approval</Text>
            <Text style={styles.modalSubtitle} numberOfLines={2}>
              {rejectModal?.title}
            </Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Feedback (optional — helps AI learn)"
              placeholderTextColor="#6b7280"
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setRejectModal(null)}
              >
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnReject]}
                onPress={confirmReject}
              >
                <Text style={styles.modalBtnTextReject}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ApprovalCard({
  approval,
  onApprove,
  onReject,
  pending,
}: {
  approval: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
  pending: boolean;
}) {
  const urgencyColor = URGENCY_COLOR[approval.urgency] ?? "#6b7280";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.agentBadge}>
          <Text style={styles.agentText}>{approval.agentType}</Text>
        </View>
        <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + "22" }]}>
          <Text style={[styles.urgencyText, { color: urgencyColor }]}>
            {approval.urgency}
          </Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>{approval.title}</Text>
      {approval.description && (
        <Text style={styles.cardDesc} numberOfLines={3}>
          {approval.description}
        </Text>
      )}

      {approval.expiresAt && (
        <Text style={styles.expires}>
          Expires {new Date(approval.expiresAt).toLocaleTimeString()}
        </Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={onReject}
          disabled={pending}
        >
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn]}
          onPress={onApprove}
          disabled={pending}
        >
          {pending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.approveBtnText}>Approve</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  content: { padding: 20, paddingBottom: 40 },
  count: { fontSize: 13, color: "#6b7280", marginBottom: 16 },
  emptyState: { alignItems: "center", marginTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#e5e7eb", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: "#6b7280" },
  card: {
    backgroundColor: "#111118",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1f1f2e",
  },
  cardHeader: { flexDirection: "row", gap: 8, marginBottom: 12 },
  agentBadge: {
    backgroundColor: "#7c3aed22",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  agentText: { color: "#a78bfa", fontSize: 11, fontWeight: "600" },
  urgencyBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  urgencyText: { fontSize: 11, fontWeight: "600" },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#f3f4f6", marginBottom: 8 },
  cardDesc: { fontSize: 13, color: "#9ca3af", lineHeight: 19, marginBottom: 10 },
  expires: { fontSize: 11, color: "#6b7280", marginBottom: 14 },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  rejectBtn: { backgroundColor: "#1f1f2e", borderWidth: 1, borderColor: "#374151" },
  approveBtn: { backgroundColor: "#7c3aed" },
  rejectBtnText: { color: "#d1d5db", fontWeight: "600", fontSize: 14 },
  approveBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#111118",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 1,
    borderColor: "#1f1f2e",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff", marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: "#9ca3af", marginBottom: 16 },
  feedbackInput: {
    backgroundColor: "#1a1a26",
    borderWidth: 1,
    borderColor: "#2a2a3e",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 14,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  modalBtnCancel: { backgroundColor: "#1f1f2e" },
  modalBtnReject: { backgroundColor: "#ef444422", borderWidth: 1, borderColor: "#ef4444" },
  modalBtnTextCancel: { color: "#d1d5db", fontWeight: "600" },
  modalBtnTextReject: { color: "#fca5a5", fontWeight: "600" },
});
