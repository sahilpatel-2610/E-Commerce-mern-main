import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../theme";

const POLICIES = [
  { icon: "💎", title: "100% Pure Fabrics", desc: "Finest silks & rich combed cotton" },
  { icon: "🔄", title: "7 Days Exchange", desc: "Hassle-free size & style exchange" },
  { icon: "🪡", title: "Surat Atelier Made", desc: "Handcrafted master tailoring" },
  { icon: "👑", title: "24/7 VIP Concierge", desc: "Personal stylists ready to assist" },
];

export default function OurPolicyGrid() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>THE VRAJ CREATION PROMISE</Text>
      <Text style={styles.sectionSub}>Uncompromising Quality, Heritage & Service</Text>

      <View style={styles.grid}>
        {POLICIES.map((p, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>{p.icon}</Text>
            </View>
            <Text style={styles.title}>{p.title}</Text>
            <Text style={styles.desc}>{p.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 14,
    backgroundColor: "#0A0A0E",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.15)",
    marginVertical: 14,
  },
  sectionHeader: {
    color: COLORS.goldLight,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  sectionSub: {
    color: "#A1A1AA",
    fontSize: 11,
    textAlign: "center",
    marginTop: 3,
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  card: {
    width: "48%",
    backgroundColor: "#111116",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  icon: {
    fontSize: 16,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 3,
  },
  desc: {
    color: "#A1A1AA",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 13,
  },
});
