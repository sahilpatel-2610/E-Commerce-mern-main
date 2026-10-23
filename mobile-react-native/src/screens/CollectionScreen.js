import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { COLORS } from "../theme";
import {
  getMobileProducts,
  getMobileCategories,
  getMobileSubCategories,
} from "../api/firebase";
import ProductCard from "../components/ProductCard";
import GoldenSweepLoader from "../components/GoldenSweepLoader";

export default function CollectionScreen({ route, navigation }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(
    route?.params?.selectedCategory || "All"
  );
  const [selectedSubCategory, setSelectedSubCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("relevant");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCollectionData();
  }, []);

  useEffect(() => {
    if (route?.params?.selectedCategory) {
      setSelectedCategory(route.params.selectedCategory);
    }
  }, [route?.params?.selectedCategory]);

  const loadCollectionData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [prods, cats, subs] = await Promise.all([
        getMobileProducts(isRefresh),
        getMobileCategories(isRefresh),
        getMobileSubCategories(isRefresh),
      ]);
      setProducts(prods);
      setCategories(cats);
      setSubCategories(subs);
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredProducts = products
    .filter((p) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === "All" ||
        p.category?.toLowerCase() === selectedCategory.toLowerCase();

      const matchesSubCat =
        selectedSubCategory === "All" ||
        p.subCategory?.toLowerCase() === selectedSubCategory.toLowerCase();

      return matchesSearch && matchesCat && matchesSubCat;
    })
    .sort((a, b) => {
      if (sortBy === "lowToHigh") return Number(a.price || 0) - Number(b.price || 0);
      if (sortBy === "highToLow") return Number(b.price || 0) - Number(a.price || 0);
      if (sortBy === "bestseller") return (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0);
      return 0;
    });

  const catNames = ["All", ...categories.map((c) => c.name || c.title || "").filter(Boolean)];

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Search bespoke shirts, kurtas, silk..."
            placeholderTextColor="#71717A"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.catScrollBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {catNames.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedCategory(cat);
                  setSelectedSubCategory("All");
                }}
                style={[styles.catPill, isSelected && styles.catPillActive]}
              >
                <Text style={[styles.catText, isSelected && styles.catTextActive]}>
                  {cat.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.countText}>
          {filteredProducts.length} {filteredProducts.length === 1 ? "PIECE" : "PIECES"} AVAILABLE
        </Text>

        <TouchableOpacity
          onPress={() =>
            setSortBy((prev) =>
              prev === "relevant"
                ? "lowToHigh"
                : prev === "lowToHigh"
                ? "highToLow"
                : prev === "highToLow"
                ? "bestseller"
                : "relevant"
            )
          }
          style={styles.sortBtn}
        >
          <Text style={styles.sortLabel}>
            Sort:{" "}
            {sortBy === "lowToHigh"
              ? "Price: Low-High"
              : sortBy === "highToLow"
              ? "Price: High-Low"
              : sortBy === "bestseller"
              ? "Bestsellers"
              : "Featured"} ⇅
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <GoldenSweepLoader size={50} />
          <Text style={styles.loadingText}>Fetching Atelier Pieces...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id || item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadCollectionData(true)}
              colors={["#F59E0B", "#FBBF24"]}
              progressBackgroundColor="#18181B"
              tintColor="#F59E0B"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <ProductCard
                product={item}
                onPress={(p) => navigation.navigate("ProductDetail", { product: p })}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07070A",
  },
  searchBarContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121217",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 12.5,
  },
  clearIcon: {
    color: "#71717A",
    fontSize: 13,
    fontWeight: "bold",
  },
  catScrollBox: {
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  catScroll: {
    paddingHorizontal: 10,
    gap: 6,
  },
  catPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#121217",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  catPillActive: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    borderColor: COLORS.gold,
  },
  catText: {
    color: "#A1A1AA",
    fontSize: 10.5,
    fontWeight: "700",
  },
  catTextActive: {
    color: COLORS.goldLight,
    fontWeight: "900",
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  countText: {
    color: "#71717A",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1,
  },
  sortBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  sortLabel: {
    color: COLORS.goldLight,
    fontSize: 10.5,
    fontWeight: "700",
  },
  gridContainer: {
    paddingHorizontal: 4,
    paddingBottom: 30,
  },
  gridItem: {
    width: "50%",
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.goldLight,
    marginTop: 8,
    fontSize: 12,
  },
});
