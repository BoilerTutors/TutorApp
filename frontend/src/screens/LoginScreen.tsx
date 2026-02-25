import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, setAuthToken } from "../api/client";
import { saveToken } from "../auth/storage";

type Role = "tutor" | "student";
type RootStackParamList = {
  Login: undefined;
  "Student Dashboard": undefined;
  "Tutor Dashboard": undefined;
  "Tutor Registration": {
    email: string;
    password: string;
    role: Role;
  };
};

export default function LoginScreen() {

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [role, setRole] = useState<Role>("tutor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      const data = await api.post<{ access_token: string; token_type: string }>(
        "/auth/login",
        { email: email.trim().toLowerCase(), password }
      );
      setAuthToken(data.access_token);
      await saveToken(data.access_token);
      if (role === "student") {
        navigation.navigate("Student Dashboard");
      } else {
        navigation.navigate("Tutor Dashboard");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Login failed. Check email and password.";
      Alert.alert("Login failed", message);
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter email and password to create an account.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long.");
      return;
    }
    if (role === "tutor") {
      navigation.navigate("Tutor Registration", {
        email: email.trim().toLowerCase(),
        password,
        role,
      });
    } else {
      Alert.alert(
        "Not implemented yet",
        "Student registration is not implemented yet. Please register as a tutor or log in."
      );
    }
  };

  return (
    <>
      <StatusBar style="dark" />
    <View style={styles.screen}>
      <View style={styles.headerWrap}>
        
        <Text style={styles.brandTitle}>
          Boiler<Text style={styles.brandTitleAccent}>Tutors</Text>
        </Text>
        <Text style={styles.brandSubtitle}>IN-PERSON ACADEMIC HELP</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{isSignUp ? "Create Your Account" : "Login to Your Account"}</Text>

        <View style={styles.inputWrap}>
          <Ionicons name="mail" size={16} color="#8C93A4" />
          <TextInput
            placeholder="your.email@purdue.edu"
            placeholderTextColor="#B0B6C3"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
        </View>

        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed" size={16} color="#8C93A4" />
          <TextInput
            placeholder="PASSWORD"
            placeholderTextColor="#B0B6C3"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
        </View>

        <View style={styles.roleRow}>
          <Pressable
            style={[styles.roleBtn, role === "tutor" && styles.roleBtnActive]}
            onPress={() => setRole("tutor")}
          >
            <View style={[styles.radio, role === "tutor" && styles.radioActive]} />
            <Text style={[styles.roleText, role === "tutor" && styles.roleTextActive]}>TUTOR</Text>
          </Pressable>

          <Pressable
            style={[styles.roleBtn, role === "student" && styles.roleBtnActive]}
            onPress={() => setRole("student")}
          >
            <View style={[styles.radio, role === "student" && styles.radioActive]} />
            <Text style={[styles.roleText, role === "student" && styles.roleTextActive]}>
              STUDENT
            </Text>
          </Pressable>
        </View>

        {isSignUp ? (
          <Text style={styles.helperText}>
            Already have an account?{" "}
            <Text style={styles.link} onPress={() => setIsSignUp(false)}>Sign In!</Text>
          </Text>
        ) : (
          <Text style={styles.helperText}>
            Don't have an account?{" "}
            <Text style={styles.link} onPress={() => setIsSignUp(true)}>Sign Up Now!</Text>
          </Text>
        )}
        
        {!isSignUp && (
          <TouchableOpacity>
            <Text style={styles.forgot}>Forgot Account?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={isSignUp ? onSignUp : onLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.loginText}>{isSignUp ? "SIGN UP" : "LOGIN"}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F6F8",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: "-20%",
  },
  headerWrap: {
    alignItems: "center",
    marginBottom: 18
  },
  brandTitle: {
    fontSize: 50,
    fontWeight: "800",
    color: "#2F3850",
    lineHeight: 56
  },
  brandTitleAccent: {
    color: "#D4AF4A"
  },
  brandSubtitle: {
    marginTop: 2,
    marginBottom: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#5D667C",
    letterSpacing: 0.6
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  cardTitle: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    color: "#3A4357",
    marginBottom: 14
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: "#2F3850",
    fontSize: 14
  },
  roleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
    marginBottom: 14
  },
  roleBtn: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D3D9E5",
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF"
  },
  roleBtnActive: {
    backgroundColor: "#E2BE57",
    borderColor: "#D6B04B"
  },
  radio: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#6D7485",
    marginRight: 8,
    backgroundColor: "transparent"
  },
  radioActive: {
    backgroundColor: "#3E3314",
    borderColor: "#3E3314"
  },
  roleText: {
    fontWeight: "700",
    color: "#4A5672",
    fontSize: 14
  },
  roleTextActive: {
    color: "#2E2A1A"
  },
  helperText: {
    textAlign: "center",
    color: "#555F75",
    fontSize: 13,
    marginBottom: 4
  },
  link: {
    color: "#3F6FB4",
    textDecorationLine: "underline"
  },
  forgot: {
    textAlign: "center",
    color: "#555F75",
    fontSize: 13,
    marginBottom: 16
  },
  loginBtn: {
    height: 42,
    borderRadius: 8,
    backgroundColor: "#2E57A2",
    alignItems: "center",
    justifyContent: "center"
  },
  loginText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.6
  }
});