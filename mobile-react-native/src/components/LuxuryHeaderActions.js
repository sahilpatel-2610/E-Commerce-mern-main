import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS } from "../theme";
import { useShopContext } from "../context/ShopContext";

export default function LuxuryHeaderActions({
  onOpenSearch,
  onOpenNotifications,
  onOpenAccount,
  onOpenCart,
}) {
  const { unreadNotifCount, user, getCartCount } = useShopContext();
  const cartCount = getCartCount();

  return (
    <View style={styles.container}>
      {/* 1. Search Action Button */}
      <TouchableOpacity activeOpacity={0.7} onPress={onOpenSearch} style={styles.iconBtn}>
        <Text style={styles.iconText}>🔍</Text>
      </TouchableOpacity>

      {/* 2. Notification Bell with Live Counter Badge */}
      <TouchableOpacity activeOpacity={0.7} onPress={onOpenNotifications} style={styles.iconBtn}>
        <Text style={styles.iconText}>🔔</Text>
        {unreadNotifCount > 0 && (
          <View style={styles.notifBadge}>
            <Text style={styles.badgeText}>{unreadNotifCount > 9 ? "9+" : unreadNotifCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 3. Profile / Account Action Button */}
      <TouchableOpacity activeOpacity={0.7} onPress={onOpenAccount} style={styles.avatarBtn}>
        <Text style={styles.avatarText}>{user ? user.name?.charAt(0).toUpperCase() : "👤"}</Text>
      </TouchableOpacity>

      {/* 4. Cart Action Button with Live Golden Counter Badge */}
      <TouchableOpacity activeOpacity={0.7} onPress={onOpenCart} style={styles.cartBtn}>
        <Text style={styles.cartIconText}>🛍️</Text>
        {cartCount > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F0F14",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: "#27272A",
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 14,
  },
  notifBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  avatarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: COLORS.goldLight,
    fontSize: 13,
    fontWeight: "bold",
  },
  cartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  cartIconText: {
    fontSize: 14,
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: "#000000",
    fontSize: 9,
    fontWeight: "900",
  },
});
