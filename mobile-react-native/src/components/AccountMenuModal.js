import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { COLORS } from "../theme";
import { useShopContext } from "../context/ShopContext";

export default function AccountMenuModal({
  visible,
  onClose,
  onNavigateOrders,
  onNavigateWishlist,
  onNavigateContact,
  onNavigateLogin,
  onNavigateProfile,
}) {
  const { user, logoutUser } = useShopContext();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.userHeader}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {user ? user.name?.charAt(0).toUpperCase() : "👤"}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user ? user.name : "Guest Patron"}</Text>
                  <Text style={styles.userSub}>{user ? user.email : "Sign in for VIP perks"}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  onClose();
                  onNavigateProfile && onNavigateProfile();
                }}
              >
                <Text style={styles.itemIcon}>👑</Text>
                <Text style={styles.itemText}>My Profile & Atelier Tier</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  onClose();
                  onNavigateOrders && onNavigateOrders();
                }}
              >
                <Text style={styles.itemIcon}>📦</Text>
                <Text style={styles.itemText}>My Orders & Live Tracking</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  onClose();
                  onNavigateWishlist && onNavigateWishlist();
                }}
              >
                <Text style={styles.itemIcon}>❤️</Text>
                <Text style={styles.itemText}>My Wishlist</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  onClose();
                  onNavigateContact && onNavigateContact();
                }}
              >
                <Text style={styles.itemIcon}>💬</Text>
                <Text style={styles.itemText}>24/7 Atelier Concierge</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              {user ? (
                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={() => {
                    logoutUser();
                    onClose();
                  }}
                >
                  <Text style={styles.logoutText}>SIGN OUT</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.loginBtn}
                  onPress={() => {
                    onClose();
                    onNavigateLogin && onNavigateLogin();
                  }}
                >
                  <Text style={styles.loginText}>SIGN IN / REGISTER</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0F0F14",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    padding: 18,
    paddingBottom: 32,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.goldLight,
    fontSize: 18,
    fontWeight: "bold",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  userSub: {
    color: "#A1A1AA",
    fontSize: 11.5,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 4,
  },
  itemIcon: {
    fontSize: 17,
    marginRight: 12,
  },
  itemText: {
    color: "#E4E4E7",
    fontSize: 13.5,
    fontWeight: "600",
  },
  loginBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  loginText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  logoutBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.5)",
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  logoutText: {
    color: COLORS.accentRed,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
