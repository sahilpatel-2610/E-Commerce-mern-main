import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import { COLORS } from "../theme";
import { addMobileSubscriber } from "../api/firebase";
import { optimizeImageUrl } from "../utils/imageOptimizer";
import MernFooter from "../components/MernFooter";
import { showToast } from "../utils/luxuryToast";

const SLIDE_HEIGHT = 380;

export default function AboutScreen({ navigation }) {
  const { width: windowWidth } = useWindowDimensions();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [emailInput, setEmailInput] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const slides = [
    {
      id: "s1",
      title: "Surat Atelier Lookbook",
      tag: "LOOKBOOK 01",
      caption: "Bespoke Craftsmanship & Luxury Weaves",
      src: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=1080",
    },
    {
      id: "s2",
      title: "Signature Tailoring",
      tag: "LOOKBOOK 02",
      caption: "Precision Cut & Modern Silhouette",
      src: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1080",
    },
    {
      id: "s3",
      title: "Everyday Prestige",
      tag: "LOOKBOOK 03",
      caption: "Comfort, Breathability & Elegance",
      src: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1080",
    },
  ];

  const currentSlide = slides[currentSlideIndex];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 400);
  };

  const handleSubscribe = async () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      showToast("Please enter a valid email address.", "VIP DROPS", "error");
      return;
    }
    setSubscribing(true);
    await addMobileSubscriber(emailInput.trim());
    setSubscribing(false);
    setEmailInput("");
    showToast("Subscribed to Vraj Creation VIP Drops!", "VIP SUBSCRIBED", "success");
  };

  return (
    <ScrollView
      style={styles.container}
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
      <View style={styles.heroSection}>
        <Text style={styles.goldBadge}>THE SURAT ATELIER STORY</Text>
        <Text style={styles.heroTitle}>Bespoke Luxury & Heritage Craftsmanship</Text>
        <Text style={styles.heroDesc}>
          Founded in Surat, Gujarat — the textile heart of India — Vraj Creation weaves traditional artisanal mastery with contemporary tailoring.
        </Text>
      </View>

      <View style={styles.lookbookContainer}>
        <View style={styles.lookbookCard}>
          <Image
            source={{ uri: optimizeImageUrl(currentSlide.src, 1080) }}
            style={styles.slideMedia}
            resizeMode="cover"
          />
          <View style={styles.slideScrim} />

          <View style={styles.slideContent}>
            <View style={styles.slideTag}>
              <Text style={styles.slideTagText}>✨ {currentSlide.tag}</Text>
            </View>
            <Text style={styles.slideTitle}>{currentSlide.title}</Text>
            <Text style={styles.slideCaption}>{currentSlide.caption}</Text>
          </View>
        </View>

        <View style={styles.slideSelectorRow}>
          {slides.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setCurrentSlideIndex(i)}
              style={[
                styles.selectorDot,
                i === currentSlideIndex && styles.selectorDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.valuesSection}>
        <Text style={styles.sectionBadge}>OUR PILLARS</Text>
        <Text style={styles.sectionHeader}>The Atelier Philosophy</Text>

        <View style={styles.valuesGrid}>
          <View style={styles.valueCard}>
            <Text style={styles.valIcon}>🧵</Text>
            <Text style={styles.valTitle}>Masterful Weaving</Text>
            <Text style={styles.valDesc}>
              Every thread is spun from high-count cotton, pure mulberry silk, and gold jacquards.
            </Text>
          </View>

          <View style={styles.valueCard}>
            <Text style={styles.valIcon}>📐</Text>
            <Text style={styles.valTitle}>Precision Fit</Text>
            <Text style={styles.valDesc}>
              Engineered contours and ergonomic tailoring designed for effortless movement.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.newsletterBox}>
        <Text style={styles.nlBadge}>VIP CONCIERGE</Text>
        <Text style={styles.nlTitle}>Subscribe to Atelier Drops</Text>

        <View style={styles.nlInputRow}>
          <TextInput
            style={styles.nlInput}
            placeholder="Enter your email..."
            placeholderTextColor="#71717A"
            value={emailInput}
            onChangeText={setEmailInput}
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.nlBtn} onPress={handleSubscribe} disabled={subscribing}>
            <Text style={styles.nlBtnText}>{subscribing ? "..." : "JOIN"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <MernFooter onNavigate={(screen) => navigation.navigate(screen)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07070A",
  },
  heroSection: {
    padding: 20,
    alignItems: "center",
  },
  goldBadge: {
    color: COLORS.goldLight,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  heroDesc: {
    color: "#A1A1AA",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 320,
  },
  lookbookContainer: {
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  lookbookCard: {
    width: "100%",
    height: SLIDE_HEIGHT,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    backgroundColor: "#121217",
  },
  slideMedia: {
    width: "100%",
    height: "100%",
  },
  slideScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  slideContent: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  slideTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 10,
    marginBottom: 6,
  },
  slideTagText: {
    color: COLORS.goldLight,
    fontSize: 9.5,
    fontWeight: "800",
  },
  slideTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 3,
  },
  slideCaption: {
    color: "#E4E4E7",
    fontSize: 12,
  },
  slideSelectorRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  selectorDot: {
    width: 6,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  selectorDotActive: {
    width: 18,
    backgroundColor: COLORS.goldLight,
  },
  valuesSection: {
    padding: 16,
    backgroundColor: "#0A0A0E",
  },
  sectionBadge: {
    color: COLORS.goldLight,
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.5,
    textAlign: "center",
    marginBottom: 2,
  },
  sectionHeader: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 14,
  },
  valuesGrid: {
    gap: 10,
  },
  valueCard: {
    backgroundColor: "#111116",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  valIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  valTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 3,
  },
  valDesc: {
    color: "#A1A1AA",
    fontSize: 11.5,
    lineHeight: 16,
  },
  newsletterBox: {
    margin: 14,
    padding: 16,
    backgroundColor: "#101015",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    alignItems: "center",
  },
  nlBadge: {
    color: COLORS.goldLight,
    fontSize: 9.5,
    fontWeight: "900",
    marginBottom: 3,
  },
  nlTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
  },
  nlInputRow: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#181820",
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  nlInput: {
    flex: 1,
    color: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  nlBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  nlBtnText: {
    color: "#000",
    fontSize: 10.5,
    fontWeight: "900",
  },
});
