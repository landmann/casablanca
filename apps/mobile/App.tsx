import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <Text style={styles.kicker}>Casedra Mobile</Text>
        <Text style={styles.title}>Stay on top of listings anywhere.</Text>
        <Text style={styles.subtitle}>
          Review media runs, approve assets generated with fal.ai, and respond to
          new leads without leaving the field.
        </Text>
      </View>
      <View style={styles.roadmap}>
        <Text style={styles.sectionTitle}>Mobile roadmap</Text>
        <Text style={styles.bullet}>• Instant push when new AI assets are ready.</Text>
        <Text style={styles.bullet}>• Quick responses for buyer/seller conversations.</Text>
        <Text style={styles.bullet}>• Offline-ready signage and open house packs.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 32,
  },
  hero: {
    gap: 16,
  },
  kicker: {
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 2,
    fontSize: 12,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
    color: "#fff",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 24,
  },
  roadmap: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    padding: 24,
    gap: 12,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "600",
  },
  bullet: {
    color: "rgba(241,245,249,0.8)",
    fontSize: 15,
    lineHeight: 22,
  },
});
