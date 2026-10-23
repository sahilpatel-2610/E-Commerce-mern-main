import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS } from "../theme";
import { useShopContext } from "../context/ShopContext";
import { optimizeImageUrl } from "../utils/imageOptimizer";

export default function ProductCard({ product, onPress }) {
  const { addToCart, toggleWishlist, isInWishlist, currency } = useShopContext();

  const pId = product._id || product.id;
  const inWishlist = isInWishlist(pId);

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : Array.isArray(product.image) && product.image.length > 0
    ? product.image
    : [product.image || product.imageUrl || ""];

  const mainImg = optimizeImageUrl(images[0], 600);
  const price = Number(product.price) || 0;
  const oldPrice = Number(product.oldPrice) || 0;
  const discount =
    Number(product.discount) ||
    (oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0);

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={() => onPress && onPress(product)} style={styles.card}>
      <View style={styles.imageBox}>
        <Image source={{ uri: mainImg }} style={styles.image} resizeMode="cover" />

        <View style={styles.badgeTopLeft}>
          {product.bestseller || product.isFeatured ? (
            <View style={styles.bestsellerBadge}>
              <Text style={styles.bestsellerText}>👑 BESTSELLER</Text>
            </View>
          ) : null}
          {discount > 0 ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => toggleWishlist(product)}
          style={styles.wishlistBtn}
        >
          <Text style={styles.wishlistIcon}>{inWishlist ? "❤️" : "🤍"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.brand}>{product.brand || "VRAJ ATELIER"}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {product.name}
        </Text>

        <View style={styles.ratingRow}>
          <Text style={styles.ratingStar}>★</Text>
          <Text style={styles.ratingValue}>{Number(product.rating || 4.9).toFixed(1)}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.categoryTag}>{product.category || "Couture"}</Text>
        </View>

        <View style={styles.priceRow}>
          <View style={styles.priceGroup}>
            <Text style={styles.price}>
              {currency}
              {price.toLocaleString()}
            </Text>
            {oldPrice > price && (
              <Text style={styles.oldPrice}>
                {currency}
                {oldPrice.toLocaleString()}
              </Text>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => addToCart(product, product.sizes?.[0] || "M")}
            style={styles.addBtn}
          >
            <Text style={styles.addBtnText}>+ BAG</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#101015",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    margin: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  imageBox: {
    width: "100%",
    height: 175,
    position: "relative",
    backgroundColor: "#18181F",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badgeTopLeft: {
    position: "absolute",
    top: 6,
    left: 6,
    gap: 4,
  },
  bestsellerBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.9)",
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  bestsellerText: {
    color: "#000",
    fontSize: 8,
    fontWeight: "800",
  },
  discountBadge: {
    backgroundColor: COLORS.accentRed,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  discountText: {
    color: "#FFF",
    fontSize: 8.5,
    fontWeight: "800",
  },
  wishlistBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  wishlistIcon: {
    fontSize: 13,
  },
  info: {
    padding: 9,
  },
  brand: {
    color: COLORS.goldLight,
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "600",
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 4,
  },
  ratingStar: {
    color: COLORS.gold,
    fontSize: 11,
  },
  ratingValue: {
    color: "#E4E4E7",
    fontSize: 10.5,
    fontWeight: "700",
  },
  dot: {
    color: "#52525B",
    fontSize: 9,
  },
  categoryTag: {
    color: "#A1A1AA",
    fontSize: 9.5,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  priceGroup: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  price: {
    color: COLORS.goldLight,
    fontSize: 13.5,
    fontWeight: "900",
  },
  oldPrice: {
    color: "#71717A",
    fontSize: 10.5,
    textDecorationLine: "line-through",
  },
  addBtn: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 5,
  },
  addBtnText: {
    color: COLORS.goldLight,
    fontSize: 9.5,
    fontWeight: "800",
  },
});
