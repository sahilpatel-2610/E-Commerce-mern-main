import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { COLORS } from "../theme";
import { useShopContext } from "../context/ShopContext";
import { getMobileUserOrders } from "../api/mobileApi";
import { optimizeImageUrl } from "../utils/imageOptimizer";
import GoldenSweepLoader from "../components/GoldenSweepLoader";

export default function OrdersScreen({ navigation }) {
  const { user, currency } = useShopContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    try {
      const data = await getMobileUserOrders(user?.email || null);
      setOrders(data);
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <GoldenSweepLoader size={50} />
        <Text style={styles.loadingText}>Fetching your atelier orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item, index) => item._id || item.id || String(index)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#F59E0B", "#FBBF24"]}
            progressBackgroundColor="#18181B"
            tintColor="#F59E0B"
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerBadge}>ATELIER ORDER ARCHIVE</Text>
            <Text style={styles.headerTitle}>My Orders & Tracking</Text>
          </View>
        }
        renderItem={({ item }) => {
          const items = Array.isArray(item.items) ? item.items : [];
          return (
            <View style={styles.orderCard}>
              <View style={styles.orderTop}>
                <View>
                  <Text style={styles.orderIdText}>ORDER #{item._id?.slice(-8) || item.id?.slice(-8)}</Text>
                  <Text style={styles.orderDate}>Recent Order</Text>
                </View>

                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>● {item.status || "Order Placed"}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {items.map((prod, idx) => {
                const img = optimizeImageUrl(prod.image || prod.images?.[0] || "", 200);
                return (
                  <View key={idx} style={styles.itemRow}>
                    <Image source={{ uri: img }} style={styles.itemImg} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {prod.name}
                      </Text>
                      <Text style={styles.itemMeta}>
                        Size: {prod.size || "M"} • Qty: {prod.quantity || 1}
                      </Text>
                    </View>
                  </View>
                );
              })}

              <View style={styles.divider} />

              <View style={styles.orderBottom}>
                <Text style={styles.totalVal}>
                  {currency}
                  {Number(item.amount || item.subtotal || 0).toLocaleString()}
                </Text>
                <View style={styles.payBadge}>
                  <Text style={styles.payBadgeText}>{item.paymentMethod || "COD"}</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Orders Placed Yet</Text>
            <TouchableOpacity
              style={styles.shopBtn}
              onPress={() => navigation.navigate("Collection")}
            >
              <Text style={styles.shopBtnText}>EXPLORE ATELIER COLLECTION</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07070A",
  },
  center: {
    flex: 1,
    backgroundColor: "#07070A",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.goldLight,
    marginTop: 8,
    fontSize: 12,
  },
  list: {
    padding: 14,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 14,
  },
  headerBadge: {
    color: COLORS.goldLight,
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  orderCard: {
    backgroundColor: "#111116",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  orderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderIdText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  orderDate: {
    color: "#71717A",
    fontSize: 10.5,
    marginTop: 2,
  },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 10,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 0.5,
    borderColor: COLORS.gold,
  },
  statusText: {
    color: COLORS.goldLight,
    fontSize: 9.5,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  itemImg: {
    width: 44,
    height: 52,
    borderRadius: 5,
    backgroundColor: "#181820",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  itemName: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "600",
  },
  itemMeta: {
    color: "#A1A1AA",
    fontSize: 10.5,
    marginTop: 2,
  },
  orderBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalVal: {
    color: COLORS.goldLight,
    fontSize: 15,
    fontWeight: "900",
  },
  payBadge: {
    backgroundColor: "#181820",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  payBadgeText: {
    color: "#E4E4E7",
    fontSize: 10,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 10,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 14,
  },
  shopBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 7,
  },
  shopBtnText: {
    color: "#000",
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
