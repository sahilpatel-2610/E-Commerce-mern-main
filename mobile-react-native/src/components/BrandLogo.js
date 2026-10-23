import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS } from "../theme";

export default function BrandLogo({ onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.vraj}>VRAJ</Text>
        <Text style={styles.dot}> • </Text>
        <Text style={styles.creation}>CREATION</Text>
      </View>
      <Text style={styles.subtitle}>SURAT ATELIER • BESPOKE COUTURE</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  vraj: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },
  dot: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: "bold",
  },
  creation: {
    color: COLORS.goldLight,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },
  subtitle: {
    color: "#A1A1AA",
    fontSize: 8.5,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 1,
  },
});
