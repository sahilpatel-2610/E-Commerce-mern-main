import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS } from "../theme";

export default function MernFooter({ onNavigate }) {
  return (
    <View style={styles.footer}>
      <View style={styles.brandRow}>
        <Text style={styles.brandName}>VRAJ CREATION</Text>
        <Text style={styles.atelierPill}>SURAT ATELIER</Text>
      </View>

      <Text style={styles.desc}>
        Contemporary luxury menswear & ethnic festive couture woven with master Surat craftsmanship.
      </Text>

      <View style={styles.linksRow}>
        <TouchableOpacity onPress={() => onNavigate && onNavigate("Home")}>
          <Text style={styles.link}>Home</Text>
        </TouchableOpacity>
        <Text style={styles.linkDot}>•</Text>
        <TouchableOpacity onPress={() => onNavigate && onNavigate("Collection")}>
          <Text style={styles.link}>Collection</Text>
        </TouchableOpacity>
        <Text style={styles.linkDot}>•</Text>
        <TouchableOpacity onPress={() => onNavigate && onNavigate("About")}>
          <Text style={styles.link}>About</Text>
        </TouchableOpacity>
        <Text style={styles.linkDot}>•</Text>
        <TouchableOpacity onPress={() => onNavigate && onNavigate("Contact")}>
          <Text style={styles.link}>Contact</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <Text style={styles.copyright}>
        © {new Date().getFullYear()} VRAJ CREATION ATELIER. ALL RIGHTS RESERVED.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: "#050508",
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    alignItems: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  brandName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 2,
  },
  atelierPill: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    color: COLORS.goldLight,
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 1,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  desc: {
    color: "#71717A",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 14,
    maxWidth: 280,
  },
  linksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  link: {
    color: COLORS.goldLight,
    fontSize: 11.5,
    fontWeight: "600",
  },
  linkDot: {
    color: "#52525B",
    fontSize: 9,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 12,
  },
  copyright: {
    color: "#71717A",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
