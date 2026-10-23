import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Linking,
  RefreshControl,
} from "react-native";
import { COLORS } from "../theme";
import { getMobileContactInfo, sendMobileMessage } from "../api/firebase";
import MernFooter from "../components/MernFooter";
import { showToast } from "../utils/luxuryToast";

export default function ContactScreen({ navigation }) {
  const [contactInfo, setContactInfo] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    const data = await getMobileContactInfo();
    setContactInfo(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInfo();
    setRefreshing(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      showToast("Please fill in Name, Email, and Message.", "INQUIRY", "error");
      return;
    }
    setSending(true);
    await sendMobileMessage({ name, email, phone, message });
    setSending(false);
    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
    showToast("Your inquiry has been sent to our atelier concierge!", "MESSAGE SENT", "success");
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
      <View style={styles.header}>
        <Text style={styles.headerBadge}>24/7 ATELIER CONCIERGE</Text>
        <Text style={styles.headerTitle}>Contact & Flagship Showroom</Text>
        <Text style={styles.headerDesc}>
          Connect with our bespoke styling team for custom sizes, bridal orders, or inquiries.
        </Text>
      </View>

      <View style={styles.showroomCard}>
        <Image
          source={{
            uri:
              contactInfo?.image ||
              "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80",
          }}
          style={styles.media}
        />
        <View style={styles.showroomPill}>
          <Text style={styles.showroomPillText}>📍 SURAT FLAGSHIP STUDIO</Text>
        </View>

        <View style={styles.cardDetails}>
          <Text style={styles.studioTitle}>{contactInfo?.title || "Vraj Creation Atelier Studio"}</Text>
          <Text style={styles.address}>
            {contactInfo?.address ||
              "Vraj Creation Flagship Studio, Ring Road Textile Market, Surat, Gujarat 395002"}
          </Text>

          <View style={styles.infoDivider} />

          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>📞</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${contactInfo?.phone || "+919876543210"}`)}>
              <Text style={styles.contactLink}>{contactInfo?.phone || "+91 98765 43210"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>✉️</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${contactInfo?.email || "concierge@vrajcreation.com"}`)}>
              <Text style={styles.contactLink}>{contactInfo?.email || "concierge@vrajcreation.com"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>SEND BESPOKE INQUIRY</Text>

        <Text style={styles.inputLabel}>FULL NAME *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Rahul Mehta"
          placeholderTextColor="#71717A"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.inputLabel}>EMAIL ADDRESS *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. rahul@example.com"
          placeholderTextColor="#71717A"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>PHONE (OPTIONAL)</Text>
        <TextInput
          style={styles.input}
          placeholder="+91 98765 43210"
          placeholderTextColor="#71717A"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.inputLabel}>MESSAGE *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your requirements or inquiry..."
          placeholderTextColor="#71717A"
          multiline
          numberOfLines={3}
          value={message}
          onChangeText={setMessage}
        />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={sending}
          style={styles.submitBtn}
        >
          <Text style={styles.submitText}>{sending ? "SENDING..." : "SUBMIT INQUIRY →"}</Text>
        </TouchableOpacity>
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
  header: {
    padding: 18,
    alignItems: "center",
  },
  headerBadge: {
    color: COLORS.goldLight,
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 5,
  },
  headerDesc: {
    color: "#A1A1AA",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    maxWidth: 300,
  },
  showroomCard: {
    margin: 14,
    backgroundColor: "#111116",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  media: {
    width: "100%",
    height: 180,
  },
  showroomPill: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: COLORS.gold,
  },
  showroomPillText: {
    color: COLORS.goldLight,
    fontSize: 9,
    fontWeight: "800",
  },
  cardDetails: {
    padding: 14,
  },
  studioTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 3,
  },
  address: {
    color: "#A1A1AA",
    fontSize: 11.5,
    lineHeight: 16,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 10,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  contactIcon: {
    fontSize: 13,
  },
  contactLink: {
    color: COLORS.goldLight,
    fontSize: 12.5,
    fontWeight: "700",
  },
  formCard: {
    margin: 14,
    marginTop: 0,
    backgroundColor: "#111116",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  formTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputLabel: {
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
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 7,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 2,
  },
  submitText: {
    color: "#000000",
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
