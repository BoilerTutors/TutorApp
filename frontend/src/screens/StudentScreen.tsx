import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { logout } from "../auth/logout";
import { api } from "../api/client";

type MatchItem = {
  rank: number;
  tutor_id: number;
  tutor_first_name: string;
  tutor_last_name: string;
  tutor_major: string | null;
  similarity_score: number;
};

type RootStackParamList = {
  Login: undefined;
  Messenger: undefined;
  Profile: { role: "STUDENT" | "TUTOR" | "ADMINISTRATOR" };
  Settings: undefined;
  Matches: { matches?: MatchItem[] } | undefined;
};

export default function StudentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [computingMatches, setComputingMatches] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const handleComputeMatches = async () => {
    setComputingMatches(true);
    try {
      const matches = await api.post<MatchItem[]>("/matches/me/refresh");
      navigation.navigate("Matches", { matches });
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to compute matches");
    } finally {
      setComputingMatches(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>BoilerTutors</Text>
        <Text style={styles.subtitle}>
          React Native + TypeScript client scaffold
        </Text>
        <Text style={styles.body}>Active dashboard role: This is the student dashboard</Text>
        <Text style={styles.body}>
          Next steps: auth, tutor search, scheduling, messaging, reviews.
        </Text>
        <Pressable style={styles.button} onPress={() => navigation.navigate("Messenger")}>
          <Text style={styles.buttonText}>Open Messenger</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate("Profile", { role: "STUDENT" })}
        >
          <Text style={styles.buttonText}>Account & availability</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.matchButton]}
          onPress={handleComputeMatches}
          disabled={computingMatches}
        >
          {computingMatches ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Calculate Matches</Text>
          )}
        </Pressable>
      </View>
    </View>
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
    fontSize: 14,
    marginBottom: 12
  },
  button: {
    marginTop: 8,
    backgroundColor: "#2E57A2",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  logoutButton: {
    backgroundColor: "#6B7280",
    marginTop: 12,
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: "#1B2D50",
  },
  matchButton: {
    marginTop: 10,
    backgroundColor: "#1F7A4C",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});