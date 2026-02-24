import { StyleSheet, View, Image, Dimensions } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./src/screens/LoginScreen";
import StudentScreen from "./src/screens/StudentScreen";
import TutorScreen from "./src/screens/TutorScreen";
import TutorRegistrationScreen from "./src/screens/TutorRegistrationScreen";

const Stack = createNativeStackNavigator();
const HEADER_HEIGHT = Dimensions.get("window").height * 0.20;

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
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
        <Stack.Screen name="Student Dashboard" component={StudentScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Tutor Dashboard" component={TutorScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Tutor Registration" component={TutorRegistrationScreen} options={{ headerShown: false }} />
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
  }
});