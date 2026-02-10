import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { MockUserRole } from "./src/types/models";

export default function App() {
  const activeRole: MockUserRole = "student";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>BoilerTutors</Text>
        <Text style={styles.subtitle}>
          React Native + TypeScript client scaffold
        </Text>
        <Text style={styles.body}>Active dashboard role: {activeRole}</Text>
        <Text style={styles.body}>
          Next steps: auth, tutor search, scheduling, messaging, reviews.
        </Text>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f4f8",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  card: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 14
  },
  body: {
    fontSize: 15,
    marginBottom: 8
  }
});
