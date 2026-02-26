import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View, Image, Dimensions, Text } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./src/screens/LoginScreen";
import StudentScreen from "./src/screens/StudentScreen";
import TutorScreen from "./src/screens/TutorScreen";
import TutorRegistrationScreen from "./src/screens/TutorRegistrationScreen";
import StudentRegistrationScreen from "./src/screens/StudentRegistrationScreen";
import MessengerScreen from "./src/screens/MessengerScreen";
import { api, setAuthToken, setOnUnauthorized } from "./src/api/client";
import { clearToken, loadToken } from "./src/auth/storage";
import DashboardHeader from "./src/components/DashboardHeader";
import { logout } from "./src/auth/logout";
import GeneralHeader from "./src/components/GeneralHeader";

const Stack = createNativeStackNavigator();

type RootStackParamList = {
  Login: undefined;
  "Student Dashboard": undefined;
  "Tutor Dashboard": undefined;
  "Tutor Registration": undefined;
  "Student Registration": undefined;
  Messenger: undefined;
};

const navigationRef = createNavigationContainerRef<RootStackParamList>();
const HEADER_HEIGHT = Dimensions.get("window").height * 0.20;
type InitialRouteName = "Login" | "Student Dashboard" | "Tutor Dashboard";
const AUTH_CHECK_TIMEOUT_MS = 5000;
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
      // uncomment return to test different default screens. Change initialRoute default value to
      // page you want to test as well.
      // return;
      try {
        // If no token exists, render login immediately.
        const token = await loadToken();
        if (!token) {
          if (!cancelled) {
            setInitialRoute("Login");
          }
          return;
        }

        // Token exists: authenticate it once with /users/me.
        setAuthToken(token);
        const me = await withTimeout(api.get<MeResponse>("/users/me"), AUTH_CHECK_TIMEOUT_MS);
        const route: InitialRouteName = me.is_tutor ? "Tutor Dashboard" : "Student Dashboard";
        if (!cancelled) {
          setInitialRoute(route);
        }
      } catch {
        setAuthToken(null);
        await clearToken();
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

  return (
    <NavigationContainer ref={navigationRef}>
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
          options={{ header: () => <GeneralHeader title="Student Registration" /> }} 
        />

        {/* Messenger Screen */}
        <Stack.Screen 
          name="Messenger" 
          component={MessengerScreen}
          options={{ header: () => <GeneralHeader title="Messenger" /> }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
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