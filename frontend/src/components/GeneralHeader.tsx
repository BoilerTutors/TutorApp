/*
This is a general header component that can be used to display a header with a back button and a title.
This header should be used outside of the dashboard screens. It is used for users to easily navigate
back to the previous screen with ease.
*/


import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type GeneralHeaderProps = {
  title?: string;
};

export default function GeneralHeader({ title }: GeneralHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.logoWrap}>
          <Text style={styles.logoText}>
            Boiler<Text style={styles.logoAccent}>Tutors</Text>
          </Text>
        </View>

        {/* Keeps the logo centered; shows optional title or empty spacer */}
        <View style={styles.rightWrap}>
          {title ? <Text style={styles.titleText}>{title}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const NAVY = "#1B2D50";
const GOLD = "#D4AF4A";

const styles = StyleSheet.create({
  container: {
    backgroundColor: NAVY,
    paddingBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 4 },
    }),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
    paddingHorizontal: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 80,
  },
  backText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 2,
  },
  logoWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  logoText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  logoAccent: {
    color: GOLD,
  },
  rightWrap: {
    minWidth: 80,
    alignItems: "flex-end",
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});