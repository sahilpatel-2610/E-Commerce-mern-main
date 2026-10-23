import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { COLORS } from "../theme";
import { useShopContext } from "../context/ShopContext";
import { optimizeImageUrl } from "../utils/imageOptimizer";
import { showToast } from "../utils/luxuryToast";

export default function CartScreen({ navigation }) {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    getCartTotal,
    getCartCount,
    currency,
  } = useShopContext();

  const [coupon, setCoupon] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const cartKeys = Object.keys(cartItems);
  const totalCount = getCartCount();
  const subtotal = getCartTotal();

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 400);
  };

  const handleApplyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (code === "VRAJVIP" || code === "ATELIER10") {
      setDiscountPercent(10);
      showToast("VIP 10% Luxury Discount Applied!", "PROMO APPLIED", "success");
    } else {
      showToast("Invalid promo code. Try 'VRAJVIP'.", "PROMO CODE", "error");
    }
  };

  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const finalTotal = subtotal - discountAmount;

  if (totalCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛍️</Text>
        <Text style={styles.emptyTitle}>Your Shopping Bag is Empty</Text>
        <Text style={styles.emptySub}>
          Discover bespoke festive couture, luxury shirts & kurtas crafted in our Surat atelier.
        </Text>
        <TouchableOpacity
          style={styles.shopBtn}
          onPress={() => navigation.navigate("Collection")}
        >
          <Text style={styles.shopBtnText}>EXPLORE BESPOKE SHOP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
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
        <View style={styles.bagHeader}>
          <Text style={styles.bagCountText}>
            YOU HAVE {totalCount} {totalCount === 1 ? "PIECE" : "PIECES"} IN YOUR BAG
          </Text>
          <View style={styles.vipTag}>
            <Text style={styles.vipTagText}>👑 COMPLIMENTARY SHIPPING</Text>
          </View>
        </View>

        {cartKeys.map((itemId) => {
          const item = cartItems[itemId];
          const p = item?.product;
          if (!p) return null;

          const img = optimizeImageUrl(p.images?.[0] || p.image || "", 300);

          return Object.keys(item.sizes || {}).map((size) => {
            const qty = item.sizes[size];
            if (qty <= 0) return null;

            return (
              <View key={`${itemId}_${size}`} style={styles.cartCard}>
                <Image source={{ uri: img }} style={styles.itemImage} />

                <View style={styles.itemInfo}>
                  <View style={styles.itemTopRow}>
                    <Text style={styles.brandText}>{p.brand || "VRAJ ATELIER"}</Text>
                    <TouchableOpacity onPress={() => removeFromCart(itemId, size)}>
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.itemName} numberOfLines={1}>
                    {p.name}
                  </Text>

                  <View style={styles.sizePill}>
                    <Text style={styles.sizeText}>SIZE: {size}</Text>
                  </View>

                  <View style={styles.itemBottomRow}>
                    <Text style={styles.itemPrice}>
                      {currency}
                      {(Number(p.price || 0) * qty).toLocaleString()}
                    </Text>

                    <View style={styles.qtyBox}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(itemId, size, -1)}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{qty}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(itemId, size, 1)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          });
        })}

        <View style={styles.promoCard}>
          <Text style={styles.promoTitle}>VIP PROMO CODE</Text>
          <View style={styles.promoInputRow}>
            <TextInput
              style={styles.promoInput}
              placeholder="e.g. VRAJVIP"
              placeholderTextColor="#71717A"
              value={coupon}
              onChangeText={setCoupon}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.promoBtn} onPress={handleApplyCoupon}>
              <Text style={styles.promoBtnText}>APPLY</Text>
            </TouchableOpacity>
          </View>
          {discountPercent > 0 && (
            <Text style={styles.appliedText}>✓ {discountPercent}% VIP discount applied!</Text>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>ORDER SUMMARY</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bag Subtotal</Text>
            <Text style={styles.summaryVal}>
              {currency}
              {subtotal.toLocaleString()}
            </Text>
          </View>

          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountLabel}>VIP Discount ({discountPercent}%)</Text>
              <Text style={styles.discountVal}>
                -{currency}
                {discountAmount.toLocaleString()}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Express Atelier Shipping</Text>
            <Text style={styles.freeShipText}>FREE</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
            <Text style={styles.totalVal}>
              {currency}
              {finalTotal.toLocaleString()}
            </Text>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.checkoutBar}>
        <View>
          <Text style={styles.checkoutSub}>TOTAL DUE</Text>
          <Text style={styles.checkoutPrice}>
            {currency}
            {finalTotal.toLocaleString()}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() =>
            navigation.navigate("PlaceOrder", {
              subtotal,
              discountAmount,
              finalTotal,
            })
          }
          style={styles.checkoutBtn}
        >
          <Text style={styles.checkoutBtnText}>CHECKOUT NOW →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07070A",
  },
  scroll: {
    padding: 14,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#07070A",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptySub: {
    color: "#71717A",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
    maxWidth: 260,
  },
  shopBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 7,
  },
  shopBtnText: {
    color: "#000",
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 1,
  },
  bagHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  bagCountText: {
    color: "#71717A",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1,
  },
  vipTag: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  vipTagText: {
    color: COLORS.goldLight,
    fontSize: 8.5,
    fontWeight: "800",
  },
  cartCard: {
    flexDirection: "row",
    backgroundColor: "#111116",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  itemImage: {
    width: 68,
    height: 80,
    borderRadius: 6,
    backgroundColor: "#181820",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: "space-between",
  },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandText: {
    color: COLORS.goldLight,
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 1,
  },
  removeText: {
    color: "#71717A",
    fontSize: 13,
  },
  itemName: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "600",
  },
  sizePill: {
    alignSelf: "flex-start",
    backgroundColor: "#181820",
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 4,
    marginVertical: 2,
  },
  sizeText: {
    color: "#A1A1AA",
    fontSize: 9,
    fontWeight: "700",
  },
  itemBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemPrice: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181820",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  qtyBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  qtyBtnText: {
    color: COLORS.goldLight,
    fontSize: 13,
    fontWeight: "900",
  },
  qtyText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 5,
  },
  promoCard: {
    backgroundColor: "#111116",
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  promoTitle: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
  },
  promoInputRow: {
    flexDirection: "row",
    backgroundColor: "#181820",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  promoInput: {
    flex: 1,
    color: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: "700",
  },
  promoBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  promoBtnText: {
    color: "#000",
    fontSize: 10.5,
    fontWeight: "900",
  },
  appliedText: {
    color: COLORS.accentGreen,
    fontSize: 10.5,
    fontWeight: "700",
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: "#111116",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    marginTop: 4,
  },
  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: {
    color: "#A1A1AA",
    fontSize: 11.5,
  },
  summaryVal: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "600",
  },
  discountLabel: {
    color: COLORS.accentGreen,
    fontSize: 11.5,
  },
  discountVal: {
    color: COLORS.accentGreen,
    fontSize: 11.5,
    fontWeight: "700",
  },
  freeShipText: {
    color: COLORS.goldLight,
    fontSize: 10.5,
    fontWeight: "800",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  totalVal: {
    color: COLORS.goldLight,
    fontSize: 16,
    fontWeight: "900",
  },
  checkoutBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0D0D12",
    borderTopWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkoutSub: {
    color: "#71717A",
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 1,
  },
  checkoutPrice: {
    color: COLORS.goldLight,
    fontSize: 18,
    fontWeight: "900",
  },
  checkoutBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 7,
  },
  checkoutBtnText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
