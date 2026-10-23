import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { COLORS } from "../theme";
import { useShopContext } from "../context/ShopContext";
import {
  getMobileReviews,
  addMobileReview,
  getMobileProducts,
} from "../api/firebase";
import { optimizeImageUrl } from "../utils/imageOptimizer";
import ProductCard from "../components/ProductCard";
import { showToast } from "../utils/luxuryToast";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = 360;

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;
  const { addToCart, toggleWishlist, isInWishlist, currency, user } = useShopContext();

  const pId = product._id || product.id;
  const inWishlist = isInWishlist(pId);

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : Array.isArray(product.image) && product.image.length > 0
    ? product.image
    : [product.image || product.imageUrl || "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800"];

  const sizes =
    Array.isArray(product.sizes) && product.sizes.length > 0
      ? product.sizes
      : ["S", "M", "L", "XL", "XXL"];

  const [selectedSize, setSelectedSize] = useState(sizes[0] || "M");
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Review modal
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadDetails();
  }, [pId]);

  const loadDetails = async () => {
    try {
      const [revs, allProds] = await Promise.all([
        getMobileReviews(pId),
        getMobileProducts(),
      ]);
      setReviews(revs);
      const related = allProds
        .filter((p) => (p._id || p.id) !== pId && p.category === product.category)
        .slice(0, 4);
      setRelatedProducts(related);
    } catch (_) {}
  };

  const handleAddReview = async () => {
    if (!newComment.trim()) {
      showToast("Please write a short review comment.", "REVIEW", "error");
      return;
    }
    setSubmittingReview(true);
    await addMobileReview({
      productId: pId,
      userName: user ? user.name : "Valued Patron",
      userEmail: user ? user.email : "",
      rating: newRating,
      comment: newComment.trim(),
    });
    setSubmittingReview(false);
    setNewComment("");
    setReviewModalVisible(false);
    showToast("Thank you! Your review has been published.", "REVIEW PUBLISHED", "success");
    loadDetails();
  };

  const price = Number(product.price) || 0;
  const oldPrice = Number(product.oldPrice) || 0;
  const discount =
    Number(product.discount) ||
    (oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Multi-Image Gallery */}
        <View style={styles.imageGallery}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              if (idx !== activeImgIndex) setActiveImgIndex(idx);
            }}
            scrollEventThrottle={16}
          >
            {images.map((imgUrl, idx) => (
              <Image
                key={idx}
                source={{ uri: optimizeImageUrl(imgUrl, 1080) }}
                style={styles.galleryImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {images.length > 1 && (
            <View style={styles.indicatorPill}>
              <Text style={styles.indicatorText}>
                {activeImgIndex + 1} / {images.length}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.wishlistFloat}
            onPress={() => toggleWishlist(product)}
          >
            <Text style={styles.wishlistIcon}>{inWishlist ? "❤️" : "🤍"}</Text>
          </TouchableOpacity>
        </View>

        {/* Details Box */}
        <View style={styles.detailsBox}>
          <View style={styles.topInfoRow}>
            <Text style={styles.brandText}>{product.brand || "VRAJ CREATION ATELIER"}</Text>
            <View style={styles.atelierBadge}>
              <Text style={styles.atelierBadgeText}>✨ SURAT BESPOKE</Text>
            </View>
          </View>

          <Text style={styles.title}>{product.name}</Text>

          <View style={styles.ratingRow}>
            <Text style={styles.ratingStar}>★</Text>
            <Text style={styles.ratingScore}>{Number(product.rating || 4.9).toFixed(1)}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.ratingCount}>
              {reviews.length > 0 ? `${reviews.length} Verified Reviews` : "New Atelier Edition"}
            </Text>
          </View>

          {/* Price Box */}
          <View style={styles.priceContainer}>
            <Text style={styles.currency}>{currency}</Text>
            <Text style={styles.mainPrice}>{price.toLocaleString()}</Text>
            {oldPrice > price && (
              <Text style={styles.oldPrice}>
                {currency}
                {oldPrice.toLocaleString()}
              </Text>
            )}
            {discount > 0 && (
              <View style={styles.discountPill}>
                <Text style={styles.discountText}>{discount}% OFF</Text>
              </View>
            )}
          </View>

          <Text style={styles.taxText}>Inclusive of all luxury taxes • Complimentary Atelier Delivery</Text>

          {/* Size Selector */}
          <View style={styles.sizeSection}>
            <Text style={styles.sectionTitle}>SELECT SIZE</Text>
            <View style={styles.sizeRow}>
              {sizes.map((s) => {
                const isSelected = selectedSize === s;
                return (
                  <TouchableOpacity
                    key={s}
                    activeOpacity={0.8}
                    onPress={() => setSelectedSize(s)}
                    style={[styles.sizeBtn, isSelected && styles.sizeBtnActive]}
                  >
                    <Text style={[styles.sizeBtnText, isSelected && styles.sizeBtnTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Description */}
          <View style={styles.descSection}>
            <Text style={styles.sectionTitle}>ATELIER CRAFTSMANSHIP</Text>
            <Text style={styles.descText}>
              {product.description ||
                "Finely woven from premium pure natural yarns in our Surat heritage workshop. Tailored for unparalleled comfort, luxurious drape, and distinguished festive presence."}
            </Text>
          </View>

          {/* Reviews Section */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeaderRow}>
              <Text style={styles.sectionTitle}>PATRON REVIEWS ({reviews.length})</Text>
              <TouchableOpacity
                onPress={() => setReviewModalVisible(true)}
                style={styles.writeReviewBtn}
              >
                <Text style={styles.writeReviewText}>+ WRITE REVIEW</Text>
              </TouchableOpacity>
            </View>

            {reviews.map((rev, i) => (
              <View key={rev._id || rev.id || i} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <Text style={styles.revName}>{rev.userName || "Valued Patron"}</Text>
                  <Text style={styles.revStars}>{"★".repeat(Number(rev.rating || 5))}</Text>
                </View>
                <Text style={styles.revComment}>{rev.comment}</Text>
              </View>
            ))}
          </View>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitle}>COMPLETE THE ATELIER LOOK</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
                {relatedProducts.map((item) => (
                  <View key={item._id || item.id} style={{ width: 155, marginRight: 8 }}>
                    <ProductCard
                      product={item}
                      onPress={(p) => navigation.push("ProductDetail", { product: p })}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <SafeAreaView style={styles.bottomBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => addToCart(product, selectedSize, 1)}
          style={styles.addToBagBtn}
        >
          <Text style={styles.addToBagText}>ADD TO BAG</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            addToCart(product, selectedSize, 1);
            navigation.navigate("Cart");
          }}
          style={styles.buyNowBtn}
        >
          <Text style={styles.buyNowText}>BUY NOW →</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Review Modal */}
      <Modal visible={reviewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>WRITE A REVIEW</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setNewRating(star)}>
                  <Text style={[styles.starBtn, newRating >= star && styles.starBtnActive]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Share your experience with the fabric and fit..."
              placeholderTextColor="#71717A"
              multiline
              numberOfLines={3}
              value={newComment}
              onChangeText={setNewComment}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddReview} disabled={submittingReview} style={styles.modalSubmit}>
                <Text style={styles.modalSubmitText}>{submittingReview ? "..." : "Submit"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07070A",
  },
  scrollContent: {
    paddingBottom: 90,
  },
  imageGallery: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: "#121217",
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  indicatorPill: {
    position: "absolute",
    bottom: 12,
    right: 14,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  indicatorText: {
    color: COLORS.goldLight,
    fontSize: 10.5,
    fontWeight: "800",
  },
  wishlistFloat: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  wishlistIcon: {
    fontSize: 16,
  },
  detailsBox: {
    padding: 16,
  },
  topInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  brandText: {
    color: COLORS.goldLight,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  atelierBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  atelierBadgeText: {
    color: COLORS.goldLight,
    fontSize: 8.5,
    fontWeight: "800",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  ratingStar: {
    color: COLORS.gold,
    fontSize: 12.5,
  },
  ratingScore: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  dot: {
    color: "#52525B",
  },
  ratingCount: {
    color: "#A1A1AA",
    fontSize: 11.5,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 2,
  },
  currency: {
    color: COLORS.goldLight,
    fontSize: 16,
    fontWeight: "900",
  },
  mainPrice: {
    color: COLORS.goldLight,
    fontSize: 22,
    fontWeight: "900",
  },
  oldPrice: {
    color: "#71717A",
    fontSize: 14,
    textDecorationLine: "line-through",
    marginLeft: 4,
  },
  discountPill: {
    backgroundColor: COLORS.accentRed,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginLeft: 6,
  },
  discountText: {
    color: "#FFF",
    fontSize: 9.5,
    fontWeight: "900",
  },
  taxText: {
    color: "#71717A",
    fontSize: 10.5,
    marginBottom: 14,
  },
  sizeSection: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 8,
  },
  sizeRow: {
    flexDirection: "row",
    gap: 8,
  },
  sizeBtn: {
    width: 44,
    height: 40,
    borderRadius: 7,
    backgroundColor: "#121218",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  sizeBtnActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.goldLight,
  },
  sizeBtnText: {
    color: "#E4E4E7",
    fontSize: 12,
    fontWeight: "700",
  },
  sizeBtnTextActive: {
    color: "#000000",
    fontWeight: "900",
  },
  descSection: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  descText: {
    color: "#D4D4D8",
    fontSize: 12.5,
    lineHeight: 18,
  },
  reviewsSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  reviewsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  writeReviewBtn: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  writeReviewText: {
    color: COLORS.goldLight,
    fontSize: 9.5,
    fontWeight: "800",
  },
  reviewCard: {
    backgroundColor: "#111116",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  reviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  revName: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  revStars: {
    color: COLORS.gold,
    fontSize: 11,
  },
  revComment: {
    color: "#D4D4D8",
    fontSize: 11.5,
  },
  relatedSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingTop: 12,
  },
  bottomBar: {
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
    gap: 8,
  },
  addToBagBtn: {
    flex: 1,
    backgroundColor: "#181822",
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  addToBagText: {
    color: COLORS.goldLight,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  buyNowBtn: {
    flex: 1,
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buyNowText: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#121218",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  starBtn: {
    color: "#3F3F46",
    fontSize: 28,
  },
  starBtnActive: {
    color: COLORS.gold,
  },
  modalInput: {
    backgroundColor: "#181820",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 10,
    color: "#FFFFFF",
    fontSize: 12.5,
    minHeight: 70,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  modalCancel: {
    flex: 1,
    backgroundColor: "#1F1F28",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#A1A1AA",
    fontSize: 12,
    fontWeight: "700",
  },
  modalSubmit: {
    flex: 1,
    backgroundColor: COLORS.gold,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  modalSubmitText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "900",
  },
});
