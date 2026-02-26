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
import { clearToken, saveToken } from "../auth/storage";

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
  "Student Registration": {
    email: string;
    password: string;
    role: Role;
  };
};

// Simple email format check (local@domain)
const isValidEmailFormat = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const isPurdueEmail = (s: string): boolean => s.trim().toLowerCase().endsWith("@purdue.edu");

function validateEmailForSignUp(value: string): string | null {
  const t = value.trim();
  if (!t) return "Please enter your email.";
  if (!isValidEmailFormat(t)) return "Please enter a valid email address.";
  if (!isPurdueEmail(t)) return "Email must be a Purdue email (@purdue.edu).";
  return null;
}

function validatePasswordForSignUp(value: string): string | null {
  if (!value) return "Please enter a password.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [role, setRole] = useState<Role>("tutor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }
    setLoginError(null);
    setLoading(true);
    try {
      const data = await api.post<{ access_token: string; token_type: string }>(
        "/auth/login",
        { email: email.trim().toLowerCase(), password }
      );
      setAuthToken(data.access_token);
      const me = await api.get<{ is_tutor: boolean; is_student: boolean }>("/users/me");
      const roleMismatch =
        (role === "student" && !me.is_student) ||
        (role === "tutor" && !me.is_tutor);
      if (roleMismatch) {
        setAuthToken(null);
        await clearToken();
        setLoginError("Invalid username or password.");
        return;
      }

      await saveToken(data.access_token);
      console.log("[Auth] login ok", {
        email: email.trim().toLowerCase(),
        role,
        tokenType: data.token_type,
        tokenLength: data.access_token?.length ?? 0,
      });
      if (role === "student") {
        navigation.navigate("Student Dashboard");
      } else {
        navigation.navigate("Tutor Dashboard");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid email or password.";
      setLoginError(message);
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = () => {
    const eErr = validateEmailForSignUp(email);
    const pErr = validatePasswordForSignUp(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;

    if (role === "tutor") {
      navigation.navigate("Tutor Registration", {
        email: email.trim().toLowerCase(),
        password,
        role,
      });
    } else {
      navigation.navigate("Student Registration", {
        email: email.trim().toLowerCase(),
        password,
        role,
      });
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

        <View style={styles.inputGroup}>
          <View style={[styles.inputWrap, emailError && styles.inputWrapError]}>
            <Ionicons name="mail" size={16} color={emailError ? "#B91C1C" : "#8C93A4"} />
            <TextInput
              placeholder="your.email@purdue.edu"
              placeholderTextColor="#B0B6C3"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(null); if (loginError) setLoginError(null); }}
              style={styles.input}
            />
          </View>
          {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <View style={[styles.inputWrap, passwordError && styles.inputWrapError]}>
            <Ionicons name="lock-closed" size={16} color={passwordError ? "#B91C1C" : "#8C93A4"} />
            <TextInput
              placeholder="PASSWORD"
              placeholderTextColor="#B0B6C3"
              secureTextEntry
              value={password}
              onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(null); if (loginError) setLoginError(null); }}
              style={styles.input}
            />
          </View>
          {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
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

        {!isSignUp && loginError ? (
          <View style={styles.loginErrorWrap}>
            <Text style={styles.loginErrorText}>{loginError}</Text>
          </View>
        ) : null}

        {isSignUp ? (
          <Text style={styles.helperText}>
            Already have an account?{" "}
            <Text style={styles.link} onPress={() => { setIsSignUp(false); setEmailError(null); setPasswordError(null); setLoginError(null); }}>Sign In!</Text>
          </Text>
        ) : (
          <Text style={styles.helperText}>
            Don't have an account?{" "}
            <Text style={styles.link} onPress={() => { setIsSignUp(true); setEmailError(null); setPasswordError(null); setLoginError(null); }}>Sign Up Now!</Text>
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
  inputGroup: {
    marginBottom: 10,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  inputWrapError: {
    borderColor: "#B91C1C",
  },
  fieldError: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 4,
    marginLeft: 2,
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
  loginErrorWrap: {
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#B91C1C",
  },
  loginErrorText: {
    fontSize: 14,
    color: "#B91C1C",
    fontWeight: "500",
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