import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet, Platform } from "react-native";
import { ShopContextProvider, useShopContext } from "./src/context/ShopContext";
import { COLORS } from "./src/theme";

// Components & Modals
import BrandLogo from "./src/components/BrandLogo";
import LuxuryHeaderActions from "./src/components/LuxuryHeaderActions";
import SearchModal from "./src/components/SearchModal";
import NotificationCenterModal from "./src/components/NotificationCenterModal";
import AccountMenuModal from "./src/components/AccountMenuModal";
import { ToastBanner, registerToastListener } from "./src/utils/luxuryToast";

// Screens
import HomeScreen from "./src/screens/HomeScreen";
import CollectionScreen from "./src/screens/CollectionScreen";
import ProductDetailScreen from "./src/screens/ProductDetailScreen";
import AboutScreen from "./src/screens/AboutScreen";
import ContactScreen from "./src/screens/ContactScreen";
import CartScreen from "./src/screens/CartScreen";
import PlaceOrderScreen from "./src/screens/PlaceOrderScreen";
import OrdersScreen from "./src/screens/OrdersScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SplashScreen from "./src/screens/SplashScreen";

export const navigationRef = createNavigationContainerRef();

function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator({ onOpenSearch, onOpenNotifications, onOpenAccount, onOpenCart }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#0D0D12",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(245, 158, 11, 0.2)",
        },
        headerTintColor: "#FBBF24",
        headerTitleAlign: "left",
        headerTitle: () => (
          <BrandLogo onPress={() => navigate("Home")} />
        ),
        headerRight: () => (
          <View style={{ marginRight: 14 }}>
            <LuxuryHeaderActions
              onOpenSearch={onOpenSearch}
              onOpenNotifications={onOpenNotifications}
              onOpenAccount={onOpenAccount}
              onOpenCart={onOpenCart}
            />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: "#0D0D12",
          borderTopColor: "rgba(245, 158, 11, 0.2)",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarActiveTintColor: COLORS.goldLight,
        tabBarInactiveTintColor: "#71717A",
        tabBarLabelStyle: {
          fontSize: 9.5,
          fontWeight: "700",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ color, fontSize: focused ? 19 : 17 }}>🏠</Text>
          ),
        }}
      />

      <Tab.Screen
        name="Collection"
        component={CollectionScreen}
        options={{
          tabBarLabel: "Collection",
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ color, fontSize: focused ? 19 : 17 }}>✨</Text>
          ),
        }}
      />

      <Tab.Screen
        name="About"
        component={AboutScreen}
        options={{
          tabBarLabel: "About",
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ color, fontSize: focused ? 19 : 17 }}>🏛️</Text>
          ),
        }}
      />

      <Tab.Screen
        name="Contact"
        component={ContactScreen}
        options={{
          tabBarLabel: "Contact",
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ color, fontSize: focused ? 19 : 17 }}>💬</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function MainContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [searchVisible, setSearchVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [accountVisible, setAccountVisible] = useState(false);
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    return registerToastListener((toast) => {
      setActiveToast(toast);
    });
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" backgroundColor="#07070A" />

      <ToastBanner toast={activeToast} onHide={() => setActiveToast(null)} />

      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerStyle: {
            backgroundColor: "#0D0D12",
          },
          headerTintColor: COLORS.goldLight,
          headerTitleStyle: {
            fontWeight: "bold",
            color: "#FFFFFF",
          },
        }}
      >
        <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
          {(props) => (
            <TabNavigator
              {...props}
              onOpenSearch={() => setSearchVisible(true)}
              onOpenNotifications={() => setNotifVisible(true)}
              onOpenAccount={() => setAccountVisible(true)}
              onOpenCart={() => navigate("Cart")}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{ title: "Bespoke Details" }}
        />

        <Stack.Screen
          name="Cart"
          component={CartScreen}
          options={{ title: "Shopping Bag" }}
        />

        <Stack.Screen
          name="PlaceOrder"
          component={PlaceOrderScreen}
          options={{ title: "Secure Checkout" }}
        />

        <Stack.Screen
          name="Orders"
          component={OrdersScreen}
          options={{ title: "My Atelier Orders" }}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: "My Account" }}
        />

        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: "Patron Portal" }}
        />
      </Stack.Navigator>

      <SearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onSelectProduct={(product) => {
          navigate("ProductDetail", { product });
        }}
      />

      <NotificationCenterModal
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
      />

      <AccountMenuModal
        visible={accountVisible}
        onClose={() => setAccountVisible(false)}
        onNavigateOrders={() => navigate("Orders")}
        onNavigateWishlist={() => navigate("Profile")}
        onNavigateContact={() => navigate("Contact")}
        onNavigateLogin={() => navigate("Login")}
        onNavigateProfile={() => navigate("Profile")}
      />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ShopContextProvider>
        <MainContent />
      </ShopContextProvider>
    </SafeAreaProvider>
  );
}
