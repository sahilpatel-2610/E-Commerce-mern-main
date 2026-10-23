import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { COLORS } from "../theme";
import { getMobileProducts } from "../api/firebase";
import { optimizeImageUrl } from "../utils/imageOptimizer";

export default function SearchModal({ visible, onClose, onSelectProduct }) {
  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [selectedCat, setSelectedCat] = useState("All");

  useEffect(() => {
    if (visible) {
      loadProducts();
    }
  }, [visible]);

  const loadProducts = async () => {
    const prods = await getMobileProducts();
    setAllProducts(prods);
  };

  const categories = ["All", "Shirts", "Kurtas", "Menswear", "Silk", "Festive"];

  const filteredProducts = allProducts.filter((p) => {
    const matchesQuery =
      query.trim() === "" ||
      p.name?.toLowerCase().includes(query.toLowerCase()) ||
      p.description?.toLowerCase().includes(query.toLowerCase()) ||
      p.category?.toLowerCase().includes(query.toLowerCase());

    const matchesCat =
      selectedCat === "All" ||
      p.category?.toLowerCase() === selectedCat.toLowerCase();

    return matchesQuery && matchesCat;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.input}
              placeholder="Search luxury couture, shirts, kurtas..."
              placeholderTextColor="#71717A"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} style={styles.clearBtn}>
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.catRow}>
          {categories.map((cat) => {
            const isSelected = selectedCat === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCat(cat)}
                style={[styles.catPill, isSelected && styles.catPillActive]}
              >
                <Text style={[styles.catText, isSelected && styles.catTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const img = optimizeImageUrl(item.images?.[0] || item.image || "", 200);
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  onClose();
                  onSelectProduct && onSelectProduct(item);
                }}
                style={styles.itemRow}
              >
                <Image source={{ uri: img }} style={styles.itemImg} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemCategory}>{item.category?.toUpperCase() || "ATELIER"}</Text>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemPrice}>₹{Number(item.price || 0).toLocaleString()}</Text>
                </View>
                <Text style={styles.arrowIcon}>→</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No matching items found</Text>
            </View>
          }
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
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#14141A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
  },
  clearBtn: {
    padding: 4,
  },
  clearText: {
    color: "#A1A1AA",
    fontSize: 13,
    fontWeight: "bold",
  },
  closeBtn: {
    paddingHorizontal: 6,
  },
  closeText: {
    color: COLORS.goldLight,
    fontSize: 13,
    fontWeight: "700",
  },
  catRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    flexWrap: "wrap",
  },
  catPill: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 18,
    backgroundColor: "#121218",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  catPillActive: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    borderColor: COLORS.gold,
  },
  catText: {
    color: "#A1A1AA",
    fontSize: 11.5,
    fontWeight: "600",
  },
  catTextActive: {
    color: COLORS.goldLight,
    fontWeight: "800",
  },
  list: {
    paddingHorizontal: 14,
    paddingBottom: 30,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111116",
    borderRadius: 10,
    padding: 9,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  itemImg: {
    width: 48,
    height: 56,
    borderRadius: 6,
    backgroundColor: "#181820",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  itemCategory: {
    color: COLORS.goldLight,
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  itemName: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "600",
    marginBottom: 3,
  },
  itemPrice: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  arrowIcon: {
    color: COLORS.goldLight,
    fontSize: 16,
    marginLeft: 6,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
