import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function NotificationsTab() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>
          Manage how and when you receive notifications. More options coming soon.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2F3850",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#5D667C",
    lineHeight: 22,
  },
});
