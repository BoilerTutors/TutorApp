import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View, Image, Dimensions, Text } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./src/screens/LoginScreen";
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
import { api, setAuthToken, setOnUnauthorized } from "./src/api/client";
import { clearToken, loadToken } from "./src/auth/storage";
import DashboardHeader, { ProfileHeader, SettingsHeader } from "./src/components/DashboardHeader";
import { logout } from "./src/auth/logout";
import GeneralHeader from "./src/components/GeneralHeader";
import { AuthProvider } from "./src/context/AuthContext";

const Stack = createNativeStackNavigator();

type RootStackParamList = {
  Login: undefined;
  "Student Dashboard": undefined;
  "Tutor Dashboard": undefined;
  "Tutor Registration": undefined;
  "Student Registration": undefined;
  "Student Reviews": undefined;
  "Tutor Reviews": undefined;
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
};

const navigationRef = createNavigationContainerRef<RootStackParamList>();
const HEADER_HEIGHT = Dimensions.get("window").height * 0.20;
type InitialRouteName = "Login" | "Student Dashboard" | "Tutor Dashboard";
const AUTH_CHECK_TIMEOUT_MS = 15000;
type MeResponse = { is_tutor: boolean; is_student: boolean };

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
        const me = await withTimeout(api.get<MeResponse>("/users/me"), AUTH_CHECK_TIMEOUT_MS);
        const route: InitialRouteName = me.is_tutor ? "Tutor Dashboard" : "Student Dashboard";
        if (!cancelled) {
          setInitialRoute(route);
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

          {/* Student Dashboard Screen */}
          <Stack.Screen
            name="Student Dashboard"
            component={StudentScreen}
            options={({ navigation }) => ({
              header: () => (
                <DashboardHeader
                  role="STUDENT"
                  onLogout={async () => {
                    await logout();
                    navigation.reset({
                      index: 0,
                      routes: [{ name: "Login" }],
                    });
                  }}
                  onSettingsPress={() => navigation.navigate("Settings")}
                  onNotificationsPress={() =>
                    navigation.navigate("Settings", { initialTab: "notifications" })
                  }
                />
              ),
            })}
          />

          {/* Tutor Dashboard Screen */}
          <Stack.Screen
            name="Tutor Dashboard"
            component={TutorScreen}
            options={({ navigation }) => ({
              header: () => (
                <DashboardHeader
                  role="TUTOR"
                  onLogout={async () => {
                    await logout();
                    navigation.reset({
                      index: 0,
                      routes: [{ name: "Login" }],
                    });
                  }}
                  onSettingsPress={() => navigation.navigate("Settings")}
                  onNotificationsPress={() =>
                    navigation.navigate("Settings", { initialTab: "notifications" })
                  }
                />
              ),
            })}
          />

        {/* Student Dashboard Screen */}
        <Stack.Screen
          name="Student Dashboard"
          component={StudentScreen}
          options={({ navigation }) => ({
            header: () => (
              <DashboardHeader
                role="STUDENT"
                onLogout={async () => {
                  await logout();
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "Login" }],
                  });
                }}
                onSettingsPress={() => navigation.navigate("Settings")}
                onNotificationsPress={() => navigation.navigate("Notifications")}
                onHelpPress={() => navigation.navigate("Help")}
              />
            ),
          })}
        />

        {/* Tutor Dashboard Screen */}
        <Stack.Screen
          name="Tutor Dashboard"
          component={TutorScreen}
          options={({ navigation }) => ({
            header: () => (
              <DashboardHeader
                role="TUTOR"
                onLogout={async () => {
                  await logout();
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "Login" }],
                  });
                }}
                onSettingsPress={() => navigation.navigate("Settings")}
                onNotificationsPress={() => navigation.navigate("Notifications")}
                onHelpPress={() => navigation.navigate("Help")}
              />
            ),
          })}
        />
          {/* Tutor Registration Screen */}
          <Stack.Screen 
            name="Tutor Registration" 
            component={TutorRegistrationScreen} 
            options={{ headerShown: false }} 
          />

          {/* Student Registration Screen */}
          <Stack.Screen 
            name="Student Registration" 
            component={StudentRegistrationScreen} 
            options={{ headerShown: false }} 
          />

          {/* Student Reviews Screen */}
          <Stack.Screen 
            name="Student Reviews" 
            component={StudentReviewsScreen} 
            options={{ headerShown: false }} 
          />

        {/* Student Registration Screen */}
        <Stack.Screen 
          name="Student Registration" 
          component={StudentRegistrationScreen} 
          options={{ header: () => <GeneralHeader title="Student Registration" /> }} 
        />

        {/* Messenger Screen */}
        <Stack.Screen 
          name="Messenger" 
          component={MessengerScreen}
          options={{ header: () => <GeneralHeader title="Messenger" /> }} 
        />
          {/* Tutor Reviews Screen */}
          <Stack.Screen 
            name="Tutor Reviews" 
            component={TutorReviewsScreen} 
            options={{ headerShown: false }} 
          />

          {/* Messenger Screen */}
          <Stack.Screen 
            name="Messenger" 
            component={MessengerScreen} 
            options={{ headerShown: false }} 
          />

          {/* Profile Screen */}
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen} 
            options={({ navigation, route }) => ({
              header: () => (
                <ProfileHeader
                  onBack={() => navigation.goBack()}
                  role={(route.params as { role?: "STUDENT" | "TUTOR" | "ADMINISTRATOR" } | undefined)?.role ?? "STUDENT"}
                />
              ),
            })}
          />

          {/* Settings Screen */}
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={({ navigation }) => ({
              header: () => (
                <SettingsHeader onBack={() => navigation.goBack()} />
              ),
            })}
          />

        {/* Settings Screen */}
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={({ navigation }) => ({
            header: () => (
              <SettingsHeader onBack={() => navigation.goBack()} />
            ),
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
          options={({ navigation }) => ({
            header: () => <GeneralHeader title="Help" />,
          })}
        />
        <Stack.Screen
          name="Matches"
          component={MatchesScreen}
          options={{ title: "Your Matches" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
          {/* Matches Screen */}
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
