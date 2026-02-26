import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { logout } from "../auth/logout";

type RootStackParamList = {
  Login: undefined;
  Messenger: undefined;
};

export default function StudentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
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
        <Pressable style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
          <Text style={styles.buttonText}>Log out</Text>
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
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});     