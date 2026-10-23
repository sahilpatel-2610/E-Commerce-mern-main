import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/home_screen.dart';
import 'screens/collection_screen.dart';
import 'screens/about_screen.dart';
import 'screens/contact_screen.dart';
import 'screens/login_screen.dart';
import 'screens/splash_screen.dart';
import 'widgets/luxury_loader.dart';
import 'services/cart_service.dart';
import 'services/dynamic_notification_service.dart';
import 'utils/luxury_toast.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize live dynamic notification engine (polls Firestore for admin changes)
  DynamicNotificationService.initialize();

  runApp(const VrajCreationApp());
}

class VrajCreationApp extends StatelessWidget {
  const VrajCreationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Vraj Creation',
      navigatorKey: DynamicNotificationService.navigatorKey,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF050505),
        primaryColor: const Color(0xFFF59E0B),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFF59E0B),
          secondary: Color(0xFFFBBF24),
          surface: Color(0xFF09090B),
          background: Color(0xFF050505),
        ),
        textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF09090B),
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
        progressIndicatorTheme: const ProgressIndicatorThemeData(
          color: Color(0xFFF59E0B),
          circularTrackColor: Colors.transparent,
          refreshBackgroundColor: Color(0xFF18181B),
        ),
        snackBarTheme: SnackBarThemeData(
          behavior: SnackBarBehavior.floating,
          backgroundColor: const Color(0xFF141418),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF27272A)),
          ),
          contentTextStyle: const TextStyle(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      home: const AppEntryGate(),
    );
  }
}

class AppEntryGate extends StatefulWidget {
  const AppEntryGate({super.key});

  @override
  State<AppEntryGate> createState() => _AppEntryGateState();
}

class _AppEntryGateState extends State<AppEntryGate> {
  bool _showSplash = true;

  @override
  Widget build(BuildContext context) {
    if (_showSplash) {
      return SplashScreen(
        onFinish: () {
          if (mounted) {
            setState(() => _showSplash = false);
          }
        },
      );
    }
    return const AuthGate();
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _checking = true;
  bool _isLoggedIn = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final sp = await SharedPreferences.getInstance();
    final loggedIn = sp.getBool('isLoggedIn') ?? false;
    final email = sp.getString('userEmail') ?? '';

    if (mounted) {
      setState(() {
        _isLoggedIn = loggedIn && email.isNotEmpty;
        _checking = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(
        backgroundColor: Color(0xFF050505),
        body: Center(
          child: GoldenSweepLoader(size: 50),
        ),
      );
    }

    if (_isLoggedIn) {
      return const MainNavigationHolder();
    } else {
      return const LoginScreen(
        isInitialLaunch: true,
        showWelcomePrompt: true,
      );
    }
  }
}

class MainNavigationHolder extends StatefulWidget {
  const MainNavigationHolder({super.key});

  @override
  State<MainNavigationHolder> createState() => _MainNavigationHolderState();
}

class _MainNavigationHolderState extends State<MainNavigationHolder> {
  int _currentIndex = 0;
  final cart = CartService();
  DateTime? _lastPressedAt;

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      HomeScreen(onNavigateTab: (idx) => setState(() => _currentIndex = idx)),
      const CollectionScreen(),
      const AboutScreen(),
      const ContactScreen(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_currentIndex != 0) {
          // If user is on Collection, About, or Contact tab, switch back to Home!
          setState(() => _currentIndex = 0);
        } else {
          // Double press back to exit from Home
          final now = DateTime.now();
          if (_lastPressedAt == null || now.difference(_lastPressedAt!) > const Duration(seconds: 2)) {
            _lastPressedAt = now;
            LuxuryToast.showInfo(
              context,
              "Press back again to exit Vraj Creation",
              title: "EXIT APP",
              icon: Icons.exit_to_app_rounded,
            );
          } else {
            // Exit app
            Navigator.of(context).pop();
          }
        }
      },
      child: Scaffold(
        body: IndexedStack(
          index: _currentIndex,
          children: _screens,
        ),
        bottomNavigationBar: _LuxuryBottomNav(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
        ),
      ),
    );
  }
}

class _LuxuryBottomNav extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;

  const _LuxuryBottomNav({
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final navItems = [
      const _NavItem(
        index: 0,
        label: "Home",
        activeIcon: Icons.home_rounded,
        inactiveIcon: Icons.home_outlined,
      ),
      const _NavItem(
        index: 1,
        label: "Collection",
        activeIcon: Icons.grid_view_rounded,
        inactiveIcon: Icons.grid_view_outlined,
      ),
      const _NavItem(
        index: 2,
        label: "About",
        activeIcon: Icons.auto_awesome_rounded,
        inactiveIcon: Icons.info_outline,
      ),
      const _NavItem(
        index: 3,
        label: "Contact",
        activeIcon: Icons.support_agent_rounded,
        inactiveIcon: Icons.phone_in_talk_outlined,
      ),
    ];

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF09090D),
        border: Border(
          top: BorderSide(
            color: const Color(0xFFF59E0B).withOpacity(0.2),
            width: 1,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.6),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: navItems.map((item) {
              final isActive = currentIndex == item.index;
              return GestureDetector(
                onTap: () => onTap(item.index),
                behavior: HitTestBehavior.opaque,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeInOut,
                  padding: EdgeInsets.symmetric(
                    horizontal: isActive ? 14 : 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    gradient: isActive
                        ? const LinearGradient(
                            colors: [Color(0xFFF59E0B), Color(0xFFFBBF24)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          )
                        : null,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: isActive
                        ? [
                            BoxShadow(
                              color: const Color(0xFFF59E0B).withOpacity(0.35),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ]
                        : null,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isActive ? item.activeIcon : item.inactiveIcon,
                        color: isActive ? Colors.black : Colors.white60,
                        size: 20,
                      ),
                      if (isActive) ...[
                        const SizedBox(width: 6),
                        Text(
                          item.label.toUpperCase(),
                          style: const TextStyle(
                            color: Colors.black,
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final int index;
  final String label;
  final IconData activeIcon;
  final IconData inactiveIcon;

  const _NavItem({
    required this.index,
    required this.label,
    required this.activeIcon,
    required this.inactiveIcon,
  });
}
