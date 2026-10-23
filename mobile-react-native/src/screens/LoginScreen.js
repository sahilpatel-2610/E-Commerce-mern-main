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
import { loginMobileUser, registerMobileUser } from "../api/firebase";
import { showToast } from "../utils/luxuryToast";
import GoldenSweepLoader from "../components/GoldenSweepLoader";

export default function LoginScreen({ navigation }) {
  const { loginUser } = useShopContext();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showToast("Please enter email and password.", "AUTH", "error");
      return;
    }

    setLoading(true);
    if (isRegister) {
      const res = await registerMobileUser({ name, email, phone, password });
      setLoading(false);
      if (res.success) {
        loginUser(res.user);
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate("MainTabs");
        }
      }
    } else {
      const res = await loginMobileUser({ email, password });
      setLoading(false);
      if (res.success) {
        loginUser(res.user);
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate("MainTabs");
        }
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Text style={styles.brandTitle}>VRAJ CREATION</Text>
        <Text style={styles.brandSub}>SURAT ATELIER • PATRON PORTAL</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, !isRegister && styles.tabBtnActive]}
            onPress={() => setIsRegister(false)}
          >
            <Text style={[styles.tabText, !isRegister && styles.tabTextActive]}>SIGN IN</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, isRegister && styles.tabBtnActive]}
            onPress={() => setIsRegister(true)}
          >
            <Text style={[styles.tabText, isRegister && styles.tabTextActive]}>CREATE ACCOUNT</Text>
          </TouchableOpacity>
        </View>

        {isRegister && (
          <>
            <Text style={styles.label}>FULL NAME *</Text>
            <TextInput
              style={styles.input}
              placeholder="Rahul Mehta"
              placeholderTextColor="#71717A"
              value={name}
              onChangeText={setName}
            />
          </>
        )}

        <Text style={styles.label}>EMAIL ADDRESS *</Text>
        <TextInput
          style={styles.input}
          placeholder="patron@vrajcreation.com"
          placeholderTextColor="#71717A"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {isRegister && (
          <>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor="#71717A"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </>
        )}

        <Text style={styles.label}>PASSWORD *</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#71717A"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleSubmit}
          disabled={loading}
          style={styles.submitBtn}
        >
          {loading ? (
            <GoldenSweepLoader size={24} />
          ) : (
            <Text style={styles.submitText}>
              {isRegister ? "REGISTER AS VIP PATRON →" : "SIGN IN TO ATELIER →"}
            </Text>
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
    padding: 16,
    justifyContent: "center",
    minHeight: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2,
  },
  brandSub: {
    color: COLORS.goldLight,
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#111116",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#181820",
    borderRadius: 7,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 5,
  },
  tabBtnActive: {
    backgroundColor: COLORS.gold,
  },
  tabText: {
    color: "#71717A",
    fontSize: 10.5,
    fontWeight: "800",
  },
  tabTextActive: {
    color: "#000000",
    fontWeight: "900",
  },
  label: {
    color: COLORS.goldLight,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
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
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 7,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: {
    color: "#000000",
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
