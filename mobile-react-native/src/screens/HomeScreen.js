import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { COLORS } from "../theme";
import {
  getMobileProducts,
  getMobileBanners,
  getMobileCategories,
  addMobileSubscriber,
} from "../api/firebase";
import HeroVideoBanner from "../components/HeroVideoBanner";
import ProductCard from "../components/ProductCard";
import OurPolicyGrid from "../components/OurPolicyGrid";
import MernFooter from "../components/MernFooter";
import GoldenSweepLoader from "../components/GoldenSweepLoader";
import { showToast } from "../utils/luxuryToast";

export default function HomeScreen({ navigation }) {
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async (forceRefresh = false) => {
    try {
      const [banList, catList, prodList] = await Promise.all([
        getMobileBanners(forceRefresh),
        getMobileCategories(forceRefresh),
        getMobileProducts(forceRefresh),
      ]);
      setBanners(banList);
      setCategories(catList);
      setProducts(prodList);
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData(true);
  };

  const handleSubscribe = async () => {
    const clean = emailInput.trim();
    if (!clean || !clean.includes("@")) {
      showToast("Please enter a valid email address.", "VIP DROPS", "error");
      return;
    }
    setSubscribing(true);
    await addMobileSubscriber(clean);
    setSubscribing(false);
    setEmailInput("");
    showToast("Subscribed to Vraj Creation VIP Drops!", "VIP SUBSCRIBED", "success");
  };

  const bestsellers = products.filter((p) => p.bestseller || p.isFeatured).slice(0, 8);
  const latestDrops = products.slice(0, 10);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <GoldenSweepLoader size={50} />
        <Text style={styles.loadingText}>Loading Surat Atelier Showcase...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
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
      {/* 1. Hero Video Banner */}
      <HeroVideoBanner
        banners={banners}
        onBannerPress={() => navigation.navigate("Collection")}
      />

      {/* 2. Category Quick Slider */}
      {categories.length > 0 && (
        <View style={styles.categorySection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionBadge}>✨ EXPLORE DEPARTMENTS</Text>
              <Text style={styles.sectionHeader}>CURATED CATEGORIES</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate("Collection")}>
              <Text style={styles.seeAll}>VIEW ALL →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
            {categories.map((cat, index) => {
              const catName = cat.name || cat.title || "Category";
              const catImg =
                cat.image ||
                cat.imageUrl ||
                "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300&auto=format&fit=crop&q=80";

              return (
                <TouchableOpacity
                  key={cat._id || cat.id || index}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate("Collection", { selectedCategory: catName })}
                  style={styles.catCard}
                >
                  <View style={styles.catCircle}>
                    <Image source={{ uri: catImg }} style={styles.catImg} />
                  </View>
                  <Text style={styles.catName} numberOfLines={1}>
                    {catName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 3. Bestsellers Carousel */}
      {bestsellers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionBadge}>👑 ICONIC HIGHLIGHTS</Text>
              <Text style={styles.sectionHeader}>ATELIER BESTSELLERS</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate("Collection")}>
              <Text style={styles.seeAll}>SEE ALL →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {bestsellers.map((item) => (
              <View key={item._id || item.id} style={{ width: 175 }}>
                <ProductCard
                  product={item}
                  onPress={(p) => navigation.navigate("ProductDetail", { product: p })}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 4. Latest Luxury Drops Grid */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionBadge}>✨ NEW IN STORE</Text>
            <Text style={styles.sectionHeader}>LATEST COLLECTION</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Collection")}>
            <Text style={styles.seeAll}>VIEW SHOP →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {latestDrops.map((item) => (
            <View key={item._id || item.id} style={styles.gridItem}>
              <ProductCard
                product={item}
                onPress={(p) => navigation.navigate("ProductDetail", { product: p })}
              />
            </View>
          ))}
        </View>
      </View>

      {/* 5. Policy Grid */}
      <OurPolicyGrid />

      {/* 6. VIP Drops Newsletter */}
      <View style={styles.newsletterBox}>
        <Text style={styles.nlTag}>✨ EXCLUSIVE VIP DROPS</Text>
        <Text style={styles.nlTitle}>Join the Surat Atelier Club</Text>
        <Text style={styles.nlDesc}>
          Be first to receive private collection previews & complimentary bespoke tailoring access.
        </Text>

        <View style={styles.nlInputRow}>
          <TextInput
            style={styles.nlInput}
            placeholder="Enter your email address..."
            placeholderTextColor="#71717A"
            value={emailInput}
            onChangeText={setEmailInput}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSubscribe}
            disabled={subscribing}
            style={styles.nlBtn}
          >
            <Text style={styles.nlBtnText}>{subscribing ? "..." : "SUBSCRIBE"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 7. Footer */}
      <MernFooter onNavigate={(screen) => navigation.navigate(screen)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07070A",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#07070A",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.goldLight,
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
  },
  categorySection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  section: {
    paddingVertical: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  sectionBadge: {
    color: COLORS.goldLight,
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  sectionHeader: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  seeAll: {
    color: COLORS.goldLight,
    fontSize: 11.5,
    fontWeight: "800",
  },
  catScroll: {
    paddingHorizontal: 12,
    gap: 12,
  },
  catCard: {
    alignItems: "center",
    width: 74,
  },
  catCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    overflow: "hidden",
    backgroundColor: "#181820",
    marginBottom: 5,
  },
  catImg: {
    width: "100%",
    height: "100%",
  },
  catName: {
    color: "#E4E4E7",
    fontSize: 10.5,
    fontWeight: "700",
    textAlign: "center",
  },
  horizontalList: {
    paddingHorizontal: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  gridItem: {
    width: "50%",
  },
  newsletterBox: {
    margin: 14,
    padding: 18,
    backgroundColor: "#101015",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    alignItems: "center",
  },
  nlTag: {
    color: COLORS.goldLight,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  nlTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
  },
  nlDesc: {
    color: "#A1A1AA",
    fontSize: 11.5,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 14,
  },
  nlInputRow: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#181820",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  nlInput: {
    flex: 1,
    color: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12.5,
  },
  nlBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  nlBtnText: {
    color: "#000000",
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
