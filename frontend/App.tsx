import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View, Image, Dimensions, Text } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./src/screens/LoginScreen";
import AdminLoginScreen from "./src/screens/AdminLoginScreen";
import AdminDashboard from "./src/screens/AdminDashboard";
import AdminSessionsScreen from "./src/screens/AdminSessionsScreen";
import StudentScreen from "./src/screens/StudentScreen";
import TutorScreen from "./src/screens/TutorScreen";
import TutorRegistrationScreen from "./src/screens/TutorRegistrationScreen";
import StudentRegistrationScreen from "./src/screens/StudentRegistrationScreen";
import MessengerScreen from "./src/screens/MessengerScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import MatchesScreen from "./src/screens/MatchesScreen";
import NotificationsTab from "./src/screens/settings/NotificationsTab";
import HelpScreen from "./src/screens/HelpScreen";
import StudentReviewsScreen from "./src/screens/StudentReviewsScreen";
import TutorReviewsScreen from "./src/screens/TutorReviewsScreen";
import TutorPastSessionsScreen from "./src/screens/TutorPastSessionsScreen";
import { api, setAuthToken, setOnUnauthorized } from "./src/api/client";
import { clearToken, loadToken } from "./src/auth/storage";
import DashboardHeader, { ProfileHeader, SettingsHeader } from "./src/components/DashboardHeader";
import { logout } from "./src/auth/logout";
import GeneralHeader from "./src/components/GeneralHeader";
import { AuthProvider } from "./src/context/AuthContext";
import { API_BASE_URL } from "./src/config";

const Stack = createNativeStackNavigator();

type RootStackParamList = {
  Login: undefined;
  "Admin Login": undefined;
  "Admin Dashboard": undefined;
  "Admin Sessions": undefined;
  "Student Dashboard": undefined;
  "Tutor Dashboard": undefined;
  "Tutor Registration": undefined;
  "Student Registration": undefined;
  "Student Reviews": undefined;
  "Tutor Reviews": undefined;
  "Tutor Past Sessions": undefined;
  Messenger:
    | {
        openTutorUserId?: number;
        openTutorName?: string;
      }
    | undefined;
  Settings:
    | {
        initialTab?: string;
      }
    | undefined;
  Notifications: undefined;
  Help: undefined;
  Matches: {
    matches?: Array<{
      rank: number;
      tutor_id: number;
      tutor_first_name: string;
      tutor_last_name: string;
      tutor_major: string | null;
      similarity_score: number;
    }>;
  } | undefined;
  Profile:
    | {
        role?: "STUDENT" | "TUTOR" | "ADMIN";
      }
    | undefined;
};

const navigationRef = createNavigationContainerRef<RootStackParamList>();
const HEADER_HEIGHT = Dimensions.get("window").height * 0.20;
type InitialRouteName = "Login" | "Student Dashboard" | "Tutor Dashboard" | "Admin Dashboard";
const AUTH_CHECK_TIMEOUT_MS = 15000;
type MeResponse = { is_tutor: boolean; is_student: boolean };
type AdminMeResponse = { id: number; email: string };

async function probeWithToken<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as T;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("auth timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<InitialRouteName | null>(null);

  useEffect(() => {
    setOnUnauthorized(() => {
      Alert.alert(
        "Session expired",
        "Please sign in again.",
        [{ text: "OK", onPress: () => navigationRef.resetRoot({ index: 0, routes: [{ name: "Login" }] }) }]
      );
    });
    return () => setOnUnauthorized(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      try {
        const token = await loadToken();
        if (!token) {
          if (!cancelled) {
            setInitialRoute("Login");
          }
          return;
        }

        setAuthToken(token);
        try {
          const me = await withTimeout(probeWithToken<MeResponse>("/users/me", token), AUTH_CHECK_TIMEOUT_MS);
          if (!me) {
            throw new Error("not a user token");
          }
          const route: InitialRouteName = me.is_tutor ? "Tutor Dashboard" : "Student Dashboard";
          if (!cancelled) {
            setInitialRoute(route);
          }
        } catch {
          const admin = await withTimeout(probeWithToken<AdminMeResponse>("/admin/me", token), AUTH_CHECK_TIMEOUT_MS);
          if (!cancelled && admin?.id) {
            setInitialRoute("Admin Dashboard");
          } else if (!cancelled) {
            setAuthToken(null);
            await clearToken();
            setInitialRoute("Login");
          }
        }
      } catch (e) {
        setAuthToken(null);
        // Only clear token on auth failure (401). For network/timeout errors,
        // keep the token so a refresh or retry can restore the session.
        const isAuthError = e instanceof Error && e.message.includes("session has expired");
        if (isAuthError) {
          await clearToken();
        }
        if (!cancelled) {
          setInitialRoute("Login");
        }
      }
    };

    void bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E57A2" />
        <Text style={styles.loadingText}>Restoring session...</Text>
      </View>
    );
  }

  const linking = {
    prefixes: [],
    config: {
      screens: {
        Login: "login",
        "Admin Login": "admin/login",
        "Admin Dashboard": "admin/dashboard",
        Profile: "profile",
      },
    },
  };

  return (
    <AuthProvider>
      <NavigationContainer linking={linking as any} ref={navigationRef}>
        <Stack.Navigator initialRouteName={initialRoute} key={initialRoute}>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              header: () => (
                <View style={styles.loginHeader}>
                  <Image
                    source={require("./src/assets/purdue_logo.png")}
                    style={styles.loginHeaderImage}
                    resizeMode="cover"
                  />
                </View>
              )
            }}
          />
          <Stack.Screen
            name="Admin Login"
            component={AdminLoginScreen}
            options={{
              header: () => (
                <View style={styles.loginHeader}>
                  <Image
                    source={require("./src/assets/purdue_logo.png")}
                    style={styles.loginHeaderImage}
                    resizeMode="cover"
                  />
                </View>
              )
            }}
          />
          <Stack.Screen
            name="Admin Dashboard"
            component={AdminDashboard}
            options={({ navigation }) => ({
              header: () => (
                <DashboardHeader
                  role="ADMIN"
                  onLogout={async () => {
                    await logout();
                    navigation.reset({ index: 0, routes: [{ name: "Admin Login" }] });
                  }}
                  onHelpPress={() => navigation.navigate("Help")}
                />
              ),
            })}
          />
          <Stack.Screen
            name="Admin Sessions"
            component={AdminSessionsScreen}
            options={{ header: () => <GeneralHeader title="Recent Purchases" /> }}
          />
          <Stack.Screen
            name="Student Dashboard"
            component={StudentScreen}
            options={({ navigation }) => ({
              header: () => (
                <DashboardHeader
                  role="STUDENT"
                  onLogout={async () => {
                    await logout();
                    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
                  }}
                  onSettingsPress={() => navigation.navigate("Settings")}
                  onNotificationsPress={() => navigation.navigate("Notifications")}
                  onHelpPress={() => navigation.navigate("Help")}
                />
              ),
            })}
          />
          <Stack.Screen
            name="Tutor Dashboard"
            component={TutorScreen}
            options={({ navigation }) => ({
              header: () => (
                <DashboardHeader
                  role="TUTOR"
                  onLogout={async () => {
                    await logout();
                    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
                  }}
                  onSettingsPress={() => navigation.navigate("Settings")}
                  onNotificationsPress={() => navigation.navigate("Notifications")}
                  onHelpPress={() => navigation.navigate("Help")}
                />
              ),
            })}
          />
          <Stack.Screen
            name="Tutor Registration"
            component={TutorRegistrationScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Student Registration"
            component={StudentRegistrationScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Student Reviews"
            component={StudentReviewsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Tutor Reviews"
            component={TutorReviewsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Tutor Past Sessions"
            component={TutorPastSessionsScreen}
            options={{ header: () => <GeneralHeader title="Past Sessions" /> }}
          />
          <Stack.Screen
            name="Messenger"
            component={MessengerScreen}
            options={{ header: () => <GeneralHeader title="Messenger" /> }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={({ navigation, route }) => ({
              header: () => (
                <ProfileHeader
                  onBack={() => navigation.goBack()}
                  role={
                    (
                      route.params as
                        | { role?: "STUDENT" | "TUTOR" | "ADMIN" }
                        | undefined
                    )?.role ?? "STUDENT"
                  }
                />
              ),
            })}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={({ navigation }) => ({
              header: () => <SettingsHeader onBack={() => navigation.goBack()} />,
            })}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsTab}
            options={{ title: "Notifications" }}
          />
          <Stack.Screen
            name="Help"
            component={HelpScreen}
            options={{ header: () => <GeneralHeader title="Help" /> }}
          />
          <Stack.Screen
            name="Matches"
            component={MatchesScreen}
            options={{ title: "Your Matches" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loginHeader: {
    width: "100%",
    height: HEADER_HEIGHT,
    overflow: "hidden",
    paddingTop: "20%",
    marginBottom: "-15%",
    marginTop: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F6F8",
  },
  loginHeaderImage: {
    width: "90%",
    height: "100%"
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F6F8",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#59627A",
  },
});
