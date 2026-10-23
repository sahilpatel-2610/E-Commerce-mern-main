import 'dart:io';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:video_player/video_player.dart';
import '../services/firebase_service.dart';
import '../services/dynamic_notification_service.dart';
import '../screens/profile_screen.dart';
import '../screens/orders_screen.dart';
import '../screens/login_screen.dart';
import '../utils/luxury_toast.dart';
import '../utils/image_optimizer.dart';

class AccountMenuModal {
  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      isDismissible: true,
      enableDrag: true,
      backgroundColor: const Color(0xFF0A0A0E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        side: BorderSide(color: Color(0xFFF59E0B), width: 1.5),
      ),
      builder: (ctx) {
        return const _AccountMenuContent();
      },
    );
  }
}

class _AccountMenuContent extends StatefulWidget {
  const _AccountMenuContent();

  @override
  State<_AccountMenuContent> createState() => _AccountMenuContentState();
}

class _AccountMenuContentState extends State<_AccountMenuContent> {
  bool _isLoggedIn = false;
  String _userName = "Valued Patron";
  String _userEmail = "Guest User";
  String? _userAvatar;
  VideoPlayerController? _videoCtrl;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _videoCtrl?.dispose();
    super.dispose();
  }

  bool _isVideo(String url) {
    final lower = url.trim().toLowerCase();
    return lower.endsWith('.mp4') ||
        lower.endsWith('.mov') ||
        lower.endsWith('.webm') ||
        lower.endsWith('.mkv') ||
        lower.contains('.mp4?') ||
        lower.contains('/video/upload/');
  }

  Future<void> _loadData() async {
    final sp = await SharedPreferences.getInstance();
    final loggedIn = sp.getBool('isLoggedIn') ?? false;
    final email = sp.getString('userEmail') ?? "";
    final name = sp.getString('userName') ?? (loggedIn ? "Valued Patron" : "Guest Patron");
    final avatar = sp.getString('userAvatar') ?? sp.getString('cloudAvatarUrl') ?? sp.getString('localAvatarPath');
    final isAvatarVideo = sp.getBool('isAvatarVideo') ?? false;

    if (mounted) {
      setState(() {
        _isLoggedIn = loggedIn;
        _userEmail = email.isNotEmpty ? email : "Sign in to manage your account & orders";
        _userName = name;
        _userAvatar = avatar;
      });
    }

    if (avatar != null && avatar.isNotEmpty && (isAvatarVideo || _isVideo(avatar))) {
      _initVideo(avatar);
    }

    // Live background sync from Firebase Firestore
    if (loggedIn && email.isNotEmpty) {
      try {
        final liveUser = await FirebaseService.getUserProfile(email);
        if (liveUser != null && mounted) {
          final liveAvatar = liveUser['image']?.toString() ?? liveUser['avatar']?.toString() ?? _userAvatar;
          final isVid = liveUser['isAvatarVideo'] == true || (liveAvatar != null && _isVideo(liveAvatar));
          setState(() {
            _userName = liveUser['name']?.toString() ?? _userName;
            _userAvatar = liveAvatar;
          });
          if (liveAvatar != null && liveAvatar.isNotEmpty && isVid) {
            _initVideo(liveAvatar);
          }
        }
      } catch (_) {}
    }
  }

  void _initVideo(String url) {
    final trimmed = url.trim();
    if (trimmed.isEmpty) return;
    final optimized = ImageOptimizer.optimizeVideoUrl(trimmed, width: 360);

    _videoCtrl?.dispose();
    _videoCtrl = null;

    if (optimized.startsWith('http://') || optimized.startsWith('https://')) {
      _videoCtrl = VideoPlayerController.networkUrl(
        Uri.parse(optimized),
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
      );
    } else if (optimized.startsWith('content://')) {
      _videoCtrl = VideoPlayerController.contentUri(
        Uri.parse(optimized),
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
      );
    } else {
      final file = File(optimized);
      _videoCtrl = VideoPlayerController.file(
        file,
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
      );
    }

    _videoCtrl!
      ..setLooping(true)
      ..setVolume(0.0)
      ..initialize().timeout(const Duration(seconds: 6)).then((_) {
        if (mounted) {
          _videoCtrl!.play();
          setState(() {});
        }
      }).catchError((_) {});
  }

  Widget _buildAvatarWidget() {
    if (_userAvatar != null && _userAvatar!.isNotEmpty) {
      final trimmed = _userAvatar!.trim();
      final isVid = _isVideo(trimmed);

      if (isVid && _videoCtrl != null && _videoCtrl!.value.isInitialized) {
        final vSize = _videoCtrl!.value.size;
        final vWidth = vSize.width > 0 ? vSize.width : 16.0;
        final vHeight = vSize.height > 0 ? vSize.height : 9.0;
        return ClipOval(
          child: SizedBox(
            width: 52,
            height: 52,
            child: FittedBox(
              fit: BoxFit.cover,
              clipBehavior: Clip.hardEdge,
              child: SizedBox(
                width: vWidth,
                height: vHeight,
                child: AspectRatio(
                  aspectRatio: vWidth / vHeight,
                  child: VideoPlayer(_videoCtrl!),
                ),
              ),
            ),
          ),
        );
      }

      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return ClipOval(
          child: ImageOptimizer.cachedImage(
            imageUrl: trimmed,
            width: 52,
            height: 52,
            fit: BoxFit.cover,
          ),
        );
      } else {
        final file = File(trimmed);
        if (file.existsSync()) {
          return ClipOval(
            child: Image.file(
              file,
              width: 52,
              height: 52,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _buildInitials(),
            ),
          );
        }
      }
    }
    return _buildInitials();
  }

  Widget _buildInitials() {
    final name = _userName.trim();
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'U';
    return Container(
      width: 52,
      height: 52,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [Color(0xFFF59E0B), Color(0xFFFBBF24)],
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        initial,
        style: const TextStyle(
          color: Colors.black,
          fontWeight: FontWeight.w900,
          fontSize: 22,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF0A0A0E),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 48,
                  height: 5,
                  decoration: BoxDecoration(
                    color: const Color(0xFF3F3F46),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
              const SizedBox(height: 18),

              // ================= USER HEADER CARD =================
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF14141C),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.4),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    // Avatar Circle
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF1F1F2C),
                        border: Border.all(color: const Color(0xFFF59E0B), width: 2),
                      ),
                      child: _buildAvatarWidget(),
                    ),
                    const SizedBox(width: 14),

                    // User Info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  _userName,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (_isLoggedIn) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                                  ),
                                  child: const Text(
                                    "VIP",
                                    style: TextStyle(
                                      color: Color(0xFFFBBF24),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            _userEmail,
                            style: const TextStyle(color: Colors.white60, fontSize: 12),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),

                    // Close Button
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(
                          color: Color(0xFF27272A),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close, color: Colors.white70, size: 16),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // ================= FLOW 1: MY ACCOUNT =================
              _buildActionTile(
                icon: Icons.person_outline_rounded,
                title: "My Account",
                subtitle: "Manage personal details & shipping address",
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const ProfileScreen()),
                  );
                },
              ),

              const SizedBox(height: 10),

              // ================= FLOW 2: MY ORDERS =================
              _buildActionTile(
                icon: Icons.receipt_long_outlined,
                title: "My Orders",
                subtitle: "Live order tracking from Firebase",
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const OrdersScreen()),
                  );
                },
              ),

              const SizedBox(height: 14),
              const Divider(color: Color(0xFF27272A), height: 1),
              const SizedBox(height: 14),

              // ================= FLOW 3: SIGN OUT / SIGN IN =================
              if (_isLoggedIn)
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFDC2626).withValues(alpha: 0.4)),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.logout_rounded, color: Color(0xFFF87171), size: 20),
                    ),
                    title: const Text(
                      "Sign Out",
                      style: TextStyle(
                        color: Color(0xFFF87171),
                        fontWeight: FontWeight.bold,
                        fontSize: 14.5,
                      ),
                    ),
                    subtitle: const Text(
                      "Clear session & sign out",
                      style: TextStyle(color: Colors.white54, fontSize: 11.5),
                    ),
                    trailing: const Icon(Icons.arrow_forward_ios, color: Color(0xFFF87171), size: 14),
                    onTap: () async {
                      try {
                        await _videoCtrl?.pause();
                        await _videoCtrl?.dispose();
                      } catch (_) {}
                      _videoCtrl = null;

                      final sp = await SharedPreferences.getInstance();
                      await sp.clear();
                      await DynamicNotificationService.onUserLoggedOut();
                      if (context.mounted) {
                        Navigator.pop(context);
                        LuxuryToast.showInfo(
                          context,
                          "Logged out of Vraj Creation successfully.",
                          title: "SIGNED OUT",
                          icon: Icons.logout_rounded,
                        );
                        Navigator.pushAndRemoveUntil(
                          context,
                          MaterialPageRoute(builder: (_) => const LoginScreen(isInitialLaunch: true)),
                          (route) => false,
                        );
                      }
                    },
                  ),
                )
              else
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.login_rounded, color: Color(0xFF34D399), size: 20),
                    ),
                    title: const Text(
                      "Sign In / Register",
                      style: TextStyle(
                        color: Color(0xFF34D399),
                        fontWeight: FontWeight.bold,
                        fontSize: 14.5,
                      ),
                    ),
                    subtitle: const Text(
                      "Sign in to access your orders & account",
                      style: TextStyle(color: Colors.white54, fontSize: 11.5),
                    ),
                    trailing: const Icon(Icons.arrow_forward_ios, color: Color(0xFF34D399), size: 14),
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const LoginScreen()),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF14141C),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF27272A)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFF1F1F2C),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: const Color(0xFFFBBF24), size: 20),
        ),
        title: Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 14.5,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(color: Colors.white54, fontSize: 11.5),
        ),
        trailing: const Icon(Icons.arrow_forward_ios, color: Colors.white38, size: 14),
        onTap: onTap,
      ),
    );
  }
}
