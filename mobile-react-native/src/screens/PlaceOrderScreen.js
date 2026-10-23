import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { COLORS } from "../theme";
import { useShopContext } from "../context/ShopContext";
import { createMobileOrder } from "../api/firebase";
import { showToast } from "../utils/luxuryToast";
import GoldenSweepLoader from "../components/GoldenSweepLoader";

export default function PlaceOrderScreen({ route, navigation }) {
  const { cartItems, clearCart, user, currency } = useShopContext();
  const { subtotal = 0, discountAmount = 0, finalTotal = 0 } = route.params || {};

  const [firstName, setFirstName] = useState(user?.name?.split(" ")?.[0] || "");
  const [lastName, setLastName] = useState(user?.name?.split(" ")?.slice(1)?.join(" ") || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("Surat");
  const [pincode, setPincode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orderItems = [];
  for (const itemId in cartItems) {
    const p = cartItems[itemId]?.product;
    if (p) {
      for (const size in cartItems[itemId]?.sizes || {}) {
        const qty = cartItems[itemId].sizes[size];
        if (qty > 0) {
          orderItems.push({
            productId: p._id || p.id,
            name: p.name,
            price: Number(p.price || 0),
            quantity: qty,
            size,
            image: p.images?.[0] || p.image || "",
          });
        }
      }
    }
  }

  const handlePlaceOrder = async () => {
    if (!firstName.trim() || !email.trim() || !phone.trim() || !street.trim() || !pincode.trim()) {
      showToast("Please fill in all mandatory delivery address fields.", "CHECKOUT", "error");
      return;
    }

    setIsSubmitting(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const dynamicName = fullName || (firstName.trim() ? `${firstName.trim()} ${lastName.trim()}`.trim() : (email.trim().split("@")[0] || "Customer"));
    const orderPayload = {
      customerName: dynamicName,
      name: dynamicName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: dynamicName,
      userEmail: email.trim().toLowerCase(),
      userId: email.trim().toLowerCase(),
      phone: phone.trim(),
      items: orderItems,
      amount: finalTotal > 0 ? finalTotal : subtotal,
      address: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: dynamicName,
        name: dynamicName,
        email: email.trim(),
        phone: phone.trim(),
        street: street.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        zipcode: pincode.trim(),
        country: "India"
      },
      paymentMethod: paymentMethod.toUpperCase(),
      platform: "Mobile React Native",
      source: "Mobile React Native",
      date: Date.now(),
      createdAt: new Date().toISOString(),
    };

    const res = await createMobileOrder(orderPayload);
    setIsSubmitting(false);

    if (res.success) {
      clearCart();
      showToast("Your bespoke atelier order has been placed!", "ORDER CONFIRMED", "success");
      navigation.replace("Orders");
    } else {
      showToast("Failed to place order. Try again.", "ORDER ERROR", "error");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Text style={styles.headerBadge}>SECURE ATELIER CHECKOUT</Text>
        <Text style={styles.headerTitle}>Delivery & Payment</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. DELIVERY ADDRESS</Text>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>FIRST NAME *</Text>
            <TextInput
              style={styles.input}
              placeholder="Rahul"
              placeholderTextColor="#71717A"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>LAST NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Mehta"
              placeholderTextColor="#71717A"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>
        </View>

        <Text style={styles.label}>EMAIL ADDRESS *</Text>
        <TextInput
          style={styles.input}
          placeholder="rahul@example.com"
          placeholderTextColor="#71717A"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>PHONE NUMBER *</Text>
        <TextInput
          style={styles.input}
          placeholder="+91 98765 43210"
          placeholderTextColor="#71717A"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>STREET ADDRESS *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 402, Royal Heritage Apt, Ring Road"
          placeholderTextColor="#71717A"
          value={street}
          onChangeText={setStreet}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>CITY *</Text>
            <TextInput
              style={styles.input}
              placeholder="Surat"
              placeholderTextColor="#71717A"
              value={city}
              onChangeText={setCity}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>PINCODE *</Text>
            <TextInput
              style={styles.input}
              placeholder="395002"
              placeholderTextColor="#71717A"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. PAYMENT METHOD</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setPaymentMethod("cod")}
          style={[styles.paymentOption, paymentMethod === "cod" && styles.paymentActive]}
        >
          <Text style={styles.radio}>{paymentMethod === "cod" ? "◉" : "○"}</Text>
          <View style={styles.payInfo}>
            <Text style={styles.payTitle}>Cash on Delivery (COD)</Text>
            <Text style={styles.paySub}>Pay upon courier delivery</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setPaymentMethod("upi")}
          style={[styles.paymentOption, paymentMethod === "upi" && styles.paymentActive]}
        >
          <Text style={styles.radio}>{paymentMethod === "upi" ? "◉" : "○"}</Text>
          <View style={styles.payInfo}>
            <Text style={styles.payTitle}>Instant UPI / QR Code</Text>
            <Text style={styles.paySub}>GPay, PhonePe, Paytm</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.totalCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL AMOUNT DUE</Text>
          <Text style={styles.totalVal}>
            {currency}
            {(finalTotal > 0 ? finalTotal : subtotal).toLocaleString()}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handlePlaceOrder}
          disabled={isSubmitting}
          style={styles.confirmBtn}
        >
          {isSubmitting ? (
            <GoldenSweepLoader size={24} />
          ) : (
            <Text style={styles.confirmBtnText}>CONFIRM & PLACE ORDER →</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07070A",
  },
  scroll: {
    padding: 14,
    paddingBottom: 36,
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
  card: {
    backgroundColor: "#111116",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 14,
  },
  cardTitle: {
    color: COLORS.goldLight,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  half: {
    flex: 1,
  },
  label: {
    color: "#A1A1AA",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#181820",
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#FFFFFF",
    fontSize: 12.5,
    marginBottom: 10,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181820",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  paymentActive: {
    borderColor: COLORS.gold,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  radio: {
    color: COLORS.goldLight,
    fontSize: 16,
    marginRight: 8,
  },
  payInfo: {
    flex: 1,
  },
  payTitle: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  paySub: {
    color: "#71717A",
    fontSize: 10.5,
  },
  totalCard: {
    backgroundColor: "#111116",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  totalLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  totalVal: {
    color: COLORS.goldLight,
    fontSize: 20,
    fontWeight: "900",
  },
  confirmBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    borderRadius: 7,
    alignItems: "center",
  },
  confirmBtnText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
});
