import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { logout } from "../auth/logout";

type RootStackParamList = {
  Login: undefined;
  Messenger: undefined;
  Profile: { role: "STUDENT" | "TUTOR" | "ADMINISTRATOR" };
  Settings: undefined;
  "Tutor Reviews": undefined;
};

export default function TutorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>BoilerTutors</Text>
        <Text style={styles.subtitle}>Tutor Dashboard</Text>
        
        <Text style={styles.body}>Welcome! Manage your tutoring sessions and reviews here.</Text>

        <Pressable 
          style={styles.button} 
          onPress={() => navigation.navigate("Tutor Reviews")}
        >
          <Text style={styles.buttonText}>⭐ View My Reviews</Text>
        </Pressable>

        <Pressable 
          style={styles.button} 
          onPress={() => navigation.navigate("Messenger")}
        >
          <Text style={styles.buttonText}>💬 Open Messenger</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate("Profile", { role: "TUTOR" })}
        >
          <Text style={styles.buttonText}>👤 Account & Availability</Text>
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
    marginBottom: 4,
    color: "#2F3850",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 14,
    color: "#D4AF4A",
  },
  body: {
    fontSize: 14,
    marginBottom: 20,
    color: "#5D667C",
  },
  button: {
    marginTop: 10,
    backgroundColor: "#2E57A2",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#1B2D50",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
});
