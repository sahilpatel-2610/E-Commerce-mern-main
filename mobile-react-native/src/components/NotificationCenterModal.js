import React from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { COLORS } from "../theme";
import { useShopContext } from "../context/ShopContext";

export default function NotificationCenterModal({ visible, onClose }) {
  const { notifications, markNotificationsRead } = useShopContext();

  const handleClose = () => {
    markNotificationsRead();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
            <Text style={styles.headerSub}>Live Atelier Drops & Exclusive VIP Updates</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.doneBtn}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(item, index) => item.id || item._id || String(index)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Text style={styles.cardIcon}>📢</Text>
              </View>
              <View style={styles.content}>
                <Text style={styles.notifTitle}>{item.title || "LIVE UPDATE"}</Text>
                <Text style={styles.notifMessage}>{item.message || ""}</Text>
              </View>
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07070A",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  headerSub: {
    color: "#A1A1AA",
    fontSize: 11,
    marginTop: 2,
  },
  doneBtn: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  doneText: {
    color: COLORS.goldLight,
    fontSize: 12,
    fontWeight: "800",
  },
  list: {
    padding: 14,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#111116",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cardIcon: {
    fontSize: 15,
  },
  content: {
    flex: 1,
  },
  notifTitle: {
    color: COLORS.goldLight,
    fontSize: 12.5,
    fontWeight: "800",
    marginBottom: 3,
  },
  notifMessage: {
    color: "#E4E4E7",
    fontSize: 12,
    lineHeight: 16,
  },
});
