import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { COLORS } from "../theme";

let toastListener = null;

export const showToast = (message, title = "VRAJ CREATION", type = "info") => {
  if (toastListener) {
    toastListener({ message, title, type });
  }
};

export const registerToastListener = (callback) => {
  toastListener = callback;
  return () => {
    toastListener = null;
  };
};

export const ToastBanner = ({ toast, onHide }) => {
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [slideAnim] = React.useState(new Animated.Value(-60));

  React.useEffect(() => {
    if (toast) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: -60, duration: 250, useNativeDriver: true }),
        ]).start(() => onHide && onHide());
      }, 3200);

      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          borderColor: toast.type === "error" ? COLORS.accentRed : COLORS.gold,
        },
      ]}
    >
      <Text style={styles.icon}>{toast.type === "error" ? "⚠️" : "✨"}</Text>
      <View style={styles.content}>
        <Text style={styles.title}>{toast.title.toUpperCase()}</Text>
        <Text style={styles.message}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    backgroundColor: "#121218",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  title: {
    color: COLORS.goldLight,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  message: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "500",
  },
});
