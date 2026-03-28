import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useAuth, useSession } from "@/store/auth";

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const session = useSession();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {session?.user.name?.charAt(0).toUpperCase() ?? "?"}
          </Text>
        </View>
        <View>
          <Text style={styles.name}>{session?.user.name}</Text>
          <Text style={styles.email}>{session?.user.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <SettingRow label="Approval requests" value="Enabled" />
        <SettingRow label="Stream alerts" value="Enabled" />
        <SettingRow label="Morning brief" value="8:00 AM" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <SettingRow label="Version" value="1.0.0" />
        <SettingRow label="Environment" value={__DEV__ ? "Development" : "Production"} />
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  content: { padding: 20, paddingBottom: 40 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#111118",
    borderRadius: 14,
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#1f1f2e",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#ffffff", fontSize: 20, fontWeight: "700" },
  name: { fontSize: 16, fontWeight: "600", color: "#f3f4f6", marginBottom: 3 },
  email: { fontSize: 13, color: "#6b7280" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#111118",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "#1f1f2e",
  },
  rowLabel: { fontSize: 14, color: "#e5e7eb" },
  rowValue: { fontSize: 14, color: "#6b7280" },
  signOutBtn: {
    backgroundColor: "#1f1f2e",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  signOutText: { color: "#fca5a5", fontWeight: "600", fontSize: 15 },
});
