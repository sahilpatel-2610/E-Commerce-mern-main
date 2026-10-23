import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { COLORS } from "../theme";
import { useShopContext } from "../context/ShopContext";
import ProductCard from "../components/ProductCard";

export default function ProfileScreen({ navigation }) {
  const { user, logoutUser, getCartCount, wishlistItems } = useShopContext();
  const [refreshing, setRefreshing] = useState(false);
  const cartCount = getCartCount();
  const wishlistArray = Object.values(wishlistItems);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 400);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#F59E0B", "#FBBF24"]}
          progressBackgroundColor="#18181B"
          tintColor="#F59E0B"
        />
      }
    >
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user ? user.name?.charAt(0).toUpperCase() : "👑"}
          </Text>
        </View>

        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{user ? user.name : "Guest Patron"}</Text>
            <View style={styles.tierPill}>
              <Text style={styles.tierText}>{user ? "VIP PATRON" : "GUEST"}</Text>
            </View>
          </View>
          <Text style={styles.userEmail}>{user ? user.email : "Sign in to access VIP atelier benefits"}</Text>
        </View>
      </View>

      {!user && (
        <View style={styles.guestCard}>
          <Text style={styles.guestTitle}>Experience Surat Bespoke Couture</Text>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.signInBtnText}>SIGN IN / CREATE ACCOUNT →</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statTile} onPress={() => navigation.navigate("Orders")}>
          <Text style={styles.statIcon}>📦</Text>
          <Text style={styles.statTitle}>My Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statTile} onPress={() => navigation.navigate("Cart")}>
          <Text style={styles.statIcon}>🛍️</Text>
          <Text style={styles.statTitle}>Bag ({cartCount})</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statTile} onPress={() => navigation.navigate("Contact")}>
          <Text style={styles.statIcon}>💬</Text>
          <Text style={styles.statTitle}>Concierge</Text>
        </TouchableOpacity>
      </View>

      {wishlistArray.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>MY WISHLIST ({wishlistArray.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
            {wishlistArray.map((p) => (
              <View key={p._id || p.id} style={{ width: 155, marginRight: 8 }}>
                <ProductCard
                  product={p}
                  onPress={(item) => navigation.navigate("ProductDetail", { product: item })}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Orders")}>
          <Text style={styles.menuIcon}>📜</Text>
          <Text style={styles.menuText}>Order History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("About")}>
          <Text style={styles.menuIcon}>🏛️</Text>
          <Text style={styles.menuText}>About Surat Heritage Atelier</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Contact")}>
          <Text style={styles.menuIcon}>📍</Text>
          <Text style={styles.menuText}>Flagship Showroom & Studio</Text>
        </TouchableOpacity>

        {user && (
          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={logoutUser}>
            <Text style={styles.menuIcon}>🚪</Text>
            <Text style={[styles.menuText, { color: COLORS.accentRed }]}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07070A",
  },
  scroll: {
    padding: 14,
    paddingBottom: 36,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111116",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    marginBottom: 14,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.goldLight,
    fontSize: 20,
    fontWeight: "900",
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  tierPill: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  tierText: {
    color: COLORS.goldLight,
    fontSize: 8,
    fontWeight: "900",
  },
  userEmail: {
    color: "#A1A1AA",
    fontSize: 11.5,
  },
  guestCard: {
    backgroundColor: "#101015",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    marginBottom: 14,
    alignItems: "center",
  },
  guestTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  signInBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  signInBtnText: {
    color: "#000",
    fontSize: 10.5,
    fontWeight: "900",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 6,
  },
  statTile: {
    flex: 1,
    backgroundColor: "#111116",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  statIcon: {
    fontSize: 18,
    marginBottom: 3,
  },
  statTitle: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  section: {
    marginBottom: 14,
  },
  sectionHeader: {
    color: COLORS.goldLight,
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  menuCard: {
    backgroundColor: "#111116",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  menuIcon: {
    fontSize: 15,
    marginRight: 10,
  },
  menuText: {
    flex: 1,
    color: "#E4E4E7",
    fontSize: 12.5,
    fontWeight: "600",
  },
});
