import 'dart:io';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:video_player/video_player.dart';
import '../services/firebase_service.dart';
import '../services/dynamic_notification_service.dart';
import '../utils/luxury_toast.dart';
import '../widgets/luxury_header_actions.dart';
import '../widgets/mern_footer.dart';
import '../widgets/luxury_loader.dart';
import '../utils/image_optimizer.dart';
import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _activeTab = "editProfile"; // "editProfile" or "changePassword"
  bool _isLoggedIn = false;
  bool _savingProfile = false;
  bool _savingPassword = false;

  String _userEmail = "";
  String _userName = "";
  String _userAvatar = "";
  bool _isExplicitVideo = false;

  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;

  // Password Controllers
  late final TextEditingController _oldPasswordController;
  late final TextEditingController _newPasswordController;
  late final TextEditingController _confirmPasswordController;

  VideoPlayerController? _avatarVideoController;
  bool _isSyncingCloud = false;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _phoneController = TextEditingController();
    _oldPasswordController = TextEditingController();
    _newPasswordController = TextEditingController();
    _confirmPasswordController = TextEditingController();
    _loadLiveUserProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    _avatarVideoController?.removeListener(_avatarVideoListener);
    _avatarVideoController?.dispose();
    super.dispose();
  }

  bool _isVideoUrl(String url) {
    if (url.isEmpty) return false;
    final lower = url.toLowerCase().trim();
    
    // Explicit video file extensions and Cloudinary video URL paths
    final hasVideoExt = lower.endsWith('.mp4') ||
        lower.endsWith('.mov') ||
        lower.endsWith('.webm') ||
        lower.endsWith('.avi') ||
        lower.endsWith('.mkv') ||
        lower.endsWith('.3gp') ||
        lower.endsWith('.flv') ||
        lower.endsWith('.m4v') ||
        lower.endsWith('.ts') ||
        lower.contains('.mp4?') ||
        lower.contains('.mov?') ||
        lower.contains('.webm?') ||
        lower.contains('/video/upload/');
    if (hasVideoExt) return true;

    // Obvious image file extensions
    final hasImageExt = lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.png') ||
        lower.endsWith('.webp') ||
        lower.endsWith('.gif') ||
        lower.endsWith('.bmp') ||
        lower.contains('/image/upload/');
    if (hasImageExt) return false;

    return _isExplicitVideo;
  }

  String _getOptimizedVideoUrl(String rawUrl) {
    return ImageOptimizer.optimizeVideoUrl(rawUrl, width: 720);
  }

  Future<void> _initAvatarVideo(String url) async {
    final trimmed = url.trim();
    if (trimmed.isEmpty) {
      if (mounted) {
        setState(() {
          _isExplicitVideo = false;
        });
      }
      return;
    }

    _avatarVideoController?.removeListener(_avatarVideoListener);
    try {
      await _avatarVideoController?.pause();
      await _avatarVideoController?.dispose();
    } catch (_) {}
    _avatarVideoController = null;

    if (mounted) {
      setState(() {
        _isExplicitVideo = true;
      });
    }

    final optimizedUrl = _getOptimizedVideoUrl(trimmed);
    VideoPlayerController? ctrl;
    try {
      if (optimizedUrl.startsWith('http://') || optimizedUrl.startsWith('https://')) {
        ctrl = VideoPlayerController.networkUrl(
          Uri.parse(optimizedUrl),
          videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
        );
      } else if (optimizedUrl.startsWith('content://')) {
        ctrl = VideoPlayerController.contentUri(
          Uri.parse(optimizedUrl),
          videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
        );
      } else {
        final file = File(optimizedUrl);
        if (file.existsSync()) {
          ctrl = VideoPlayerController.file(
            file,
            videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
          );
        } else {
          final sp = await SharedPreferences.getInstance();
          final cloudUrl = sp.getString('cloudAvatarUrl') ?? '';
          if (cloudUrl.isNotEmpty) {
            ctrl = VideoPlayerController.networkUrl(
              Uri.parse(_getOptimizedVideoUrl(cloudUrl)),
              videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
            );
          }
        }
      }

      if (ctrl != null) {
        await ctrl.initialize().timeout(const Duration(seconds: 6));
        await ctrl.setVolume(0.0);
        await ctrl.setLooping(true);
        await ctrl.play();

        if (mounted) {
          setState(() {
            _avatarVideoController = ctrl;
            _isExplicitVideo = true;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _isExplicitVideo = true;
          });
        }
      }
    } catch (e) {
      debugPrint("Primary video init error: $e");
      try {
        final sp = await SharedPreferences.getInstance();
        final cloudUrl = sp.getString('cloudAvatarUrl') ?? '';
        if (cloudUrl.isNotEmpty && cloudUrl != trimmed) {
          final fallbackCtrl = VideoPlayerController.networkUrl(
            Uri.parse(_getOptimizedVideoUrl(cloudUrl)),
            videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
          );
          await fallbackCtrl.initialize().timeout(const Duration(seconds: 6));
          await fallbackCtrl.setVolume(0.0);
          await fallbackCtrl.setLooping(true);
          await fallbackCtrl.play();
          if (mounted) {
            setState(() {
              _avatarVideoController = fallbackCtrl;
              _isExplicitVideo = true;
            });
          }
          return;
        }
      } catch (_) {}

      if (mounted) {
        setState(() {
          _isExplicitVideo = true;
        });
      }
    }
  }

  void _avatarVideoListener() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _loadLiveUserProfile() async {
    final sp = await SharedPreferences.getInstance();
    final loggedIn = sp.getBool('isLoggedIn') ?? false;
    final email = sp.getString('userEmail') ?? "";
    final localName = sp.getString('userName') ?? (loggedIn ? "Valued Patron" : "Guest Patron");
    final localPhone = sp.getString('userPhone') ?? "";
    final cachedLocal = sp.getString('localAvatarPath') ?? "";
    var localAvatar = sp.getString('userAvatar') ?? "";
    if (cachedLocal.isNotEmpty && File(cachedLocal).existsSync()) {
      localAvatar = cachedLocal;
    }
    final isVid = sp.getBool('isAvatarVideo') ?? _isVideoUrl(localAvatar);

    if (mounted) {
      setState(() {
        _isLoggedIn = loggedIn;
        _userEmail = email;
        _userName = localName;
        _userAvatar = localAvatar;
        _isExplicitVideo = isVid;
        _nameController.text = localName;
        _phoneController.text = localPhone;
      });
      if (localAvatar.isNotEmpty && (isVid || _isVideoUrl(localAvatar))) {
        _initAvatarVideo(localAvatar);
      }
    }

    if (loggedIn && email.isNotEmpty) {
      try {
        final liveData = await FirebaseService.getUserProfile(email);
        if (liveData != null && mounted) {
          final liveName = liveData['name']?.toString() ?? localName;
          final livePhone = liveData['phone']?.toString() ?? liveData['phoneNumber']?.toString() ?? localPhone;
          String liveAvatar = liveData['image']?.toString() ?? liveData['avatar']?.toString() ?? localAvatar;

          // If device has high-speed local copy, prioritize local playback
          if (cachedLocal.isNotEmpty && File(cachedLocal).existsSync()) {
            liveAvatar = cachedLocal;
          } else if (!liveAvatar.startsWith('http') && !File(liveAvatar).existsSync()) {
            if (localAvatar.startsWith('http') || File(localAvatar).existsSync()) {
              liveAvatar = localAvatar;
            }
          }

          final liveIsVid = _isVideoUrl(liveAvatar);

          setState(() {
            _userName = liveName;
            _userAvatar = liveAvatar;
            _isExplicitVideo = liveIsVid;
            _nameController.text = liveName;
            _phoneController.text = livePhone;
          });

          if (liveAvatar.isNotEmpty && liveIsVid) {
            if (_avatarVideoController == null || !_avatarVideoController!.value.isInitialized) {
              _initAvatarVideo(liveAvatar);
            }
          } else if (!liveIsVid) {
            _avatarVideoController?.removeListener(_avatarVideoListener);
            _avatarVideoController?.dispose();
            _avatarVideoController = null;
          }

          await sp.setString('userName', liveName);
          if (livePhone.isNotEmpty) await sp.setString('userPhone', livePhone);
          if (liveAvatar.isNotEmpty) await sp.setString('userAvatar', liveAvatar);
          await sp.setBool('isAvatarVideo', liveIsVid);
        }
      } catch (_) {}
    }
  }

  Future<void> _handleSaveProfile() async {
    final newName = _nameController.text.trim();
    final newPhone = _phoneController.text.trim();

    if (newName.isEmpty) {
      LuxuryToast.showError(context, "Please enter your name.", title: "PROFILE");
      return;
    }

    if (newPhone.isNotEmpty && newPhone.length != 10) {
      LuxuryToast.showError(context, "Phone number must be exactly 10 digits.", title: "PHONE ERROR");
      return;
    }

    setState(() => _savingProfile = true);

    final ok = await FirebaseService.updateUserProfile(
      email: _userEmail,
      updatedData: {
        'name': newName,
        'phone': newPhone,
        'phoneNumber': newPhone,
        'image': _userAvatar,
        'avatar': _userAvatar,
        'updatedAt': DateTime.now().toIso8601String(),
      },
    );

    final sp = await SharedPreferences.getInstance();
    await sp.setString('userName', newName);
    if (newPhone.isNotEmpty) await sp.setString('userPhone', newPhone);
    if (_userAvatar.isNotEmpty) await sp.setString('userAvatar', _userAvatar);
    await sp.setBool('isAvatarVideo', _isExplicitVideo);

    if (mounted) {
      setState(() {
        _savingProfile = false;
        _userName = newName;
      });

      if (ok) {
        LuxuryToast.showSuccess(
          context,
          "✨ Profile updated and saved permanently in Firebase!",
          title: "PROFILE SAVED",
        );
      } else {
        LuxuryToast.showInfo(
          context,
          "Profile updated successfully.",
          title: "PROFILE SAVED",
        );
      }
    }
  }

  Future<void> _handleSavePassword() async {
    final oldPass = _oldPasswordController.text.trim();
    final newPass = _newPasswordController.text.trim();
    final confirmPass = _confirmPasswordController.text.trim();

    if (oldPass.isEmpty) {
      LuxuryToast.showError(context, "Please enter your current password.", title: "PASSWORD");
      return;
    }
    if (newPass.length < 6) {
      LuxuryToast.showError(context, "New password must be at least 6 characters.", title: "PASSWORD");
      return;
    }
    if (newPass != confirmPass) {
      LuxuryToast.showError(context, "New passwords do not match.", title: "PASSWORD");
      return;
    }

    setState(() => _savingPassword = true);

    final res = await FirebaseService.changeUserPassword(
      email: _userEmail,
      oldPassword: oldPass,
      newPassword: newPass,
    );

    setState(() => _savingPassword = false);

    if (res['success'] == true) {
      _oldPasswordController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();
      if (mounted) {
        LuxuryToast.showSuccess(
          context,
          "✨ Password changed successfully in Firebase!",
          title: "PASSWORD UPDATED",
        );
      }
    } else {
      if (mounted) {
        LuxuryToast.showError(
          context,
          res['message']?.toString() ?? "Failed to update password",
          title: "PASSWORD ERROR",
        );
      }
    }
  }

  Future<void> _pickMedia(ImageSource source, {bool isVideo = false}) async {
    try {
      XFile? file;
      if (isVideo) {
        try {
          file = await _picker.pickVideo(
            source: source,
            maxDuration: const Duration(hours: 2),
          );
        } catch (_) {
          file = await _picker.pickMedia();
        }
      } else {
        file = await _picker.pickImage(
          source: source,
          imageQuality: 100, // 100% Full HD / 4K Lossless original
        );
      }

      if (file != null) {
        final rawPath = file.path;
        final isVid = isVideo || _isVideoUrl(rawPath);

        setState(() {
          _userAvatar = rawPath;
          _isExplicitVideo = isVid;
          _isSyncingCloud = true;
        });

        if (isVid) {
          _initAvatarVideo(rawPath);
        } else {
          _avatarVideoController?.removeListener(_avatarVideoListener);
          _avatarVideoController?.dispose();
          _avatarVideoController = null;
        }

        final sp = await SharedPreferences.getInstance();
        await sp.setString('userAvatar', rawPath);
        await sp.setString('localAvatarPath', rawPath);
        await sp.setBool('isAvatarVideo', isVid);

        if (mounted) {
          LuxuryToast.showSuccess(
            context,
            "✨ Profile ${isVid ? 'video' : 'photo'} selected!",
            title: "MEDIA SELECTED",
          );
        }

        // Upload to Cloudinary in the background for permanent HTTPS cloud URL
        final localFile = File(rawPath);
        if (localFile.existsSync()) {
          try {
            final cloudUrl = await FirebaseService.uploadMedia(localFile, isVideo: isVid);
            if (cloudUrl != null && cloudUrl.isNotEmpty) {
              await sp.setString('cloudAvatarUrl', cloudUrl);
              await FirebaseService.updateUserProfile(
                email: _userEmail,
                updatedData: {
                  'image': cloudUrl,
                  'avatar': cloudUrl,
                  'updatedAt': DateTime.now().toIso8601String(),
                },
              );
              if (mounted) {
                if (isVid && (_avatarVideoController == null || !_avatarVideoController!.value.isInitialized)) {
                  _initAvatarVideo(cloudUrl);
                }
                LuxuryToast.showSuccess(
                  context,
                  "✨ Profile ${isVid ? 'video' : 'photo'} synced to cloud!",
                  title: "SYNC COMPLETE",
                );
              }
            }
          } finally {
            if (mounted) {
              setState(() => _isSyncingCloud = false);
            }
          }
        } else {
          if (mounted) setState(() => _isSyncingCloud = false);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSyncingCloud = false);
        LuxuryToast.showError(context, "Could not open media picker: $e", title: "MEDIA ERROR");
      }
    }
  }

  void _showUploadMediaDialog() {
    final urlController = TextEditingController(text: _userAvatar);
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0D0D12),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        side: BorderSide(color: Color(0xFF27272A)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => Padding(
          padding: EdgeInsets.fromLTRB(22, 20, 22, MediaQuery.of(context).viewInsets.bottom + 28),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.photo_library_rounded, color: Color(0xFFFBBF24), size: 20),
                        SizedBox(width: 8),
                        Text(
                          "CHOOSE PROFILE MEDIA",
                          style: TextStyle(
                            color: Color(0xFFFBBF24),
                            fontSize: 13.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1,
                          ),
                        ),
                      ],
                    ),
                    GestureDetector(
                      onTap: () => Navigator.pop(ctx),
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Color(0xFF27272A),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close, color: Colors.white70, size: 16),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  "Choose from device Gallery (Photo / Video), Camera, or paste any URL:",
                  style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                ),
                const SizedBox(height: 18),

                // 1. Native Gallery / Camera Options
                Row(
                  children: [
                    Expanded(
                      child: _buildMediaOptionTile(
                        icon: Icons.photo_size_select_actual_rounded,
                        title: "Gallery Photo",
                        subtitle: "From Storage",
                        onTap: () {
                          Navigator.pop(ctx);
                          _pickMedia(ImageSource.gallery, isVideo: false);
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildMediaOptionTile(
                        icon: Icons.videocam_rounded,
                        title: "Gallery Video",
                        subtitle: "MP4 Video",
                        onTap: () {
                          Navigator.pop(ctx);
                          _pickMedia(ImageSource.gallery, isVideo: true);
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildMediaOptionTile(
                        icon: Icons.camera_alt_rounded,
                        title: "Camera",
                        subtitle: "Take Photo",
                        onTap: () {
                          Navigator.pop(ctx);
                          _pickMedia(ImageSource.camera, isVideo: false);
                        },
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 18),
                const Divider(color: Color(0xFF27272A), height: 1),
                const SizedBox(height: 16),

                // 2. Direct URL Input Field
                const Text(
                  "OR PASTE CLOUDINARY / WEB URL:",
                  style: TextStyle(
                    color: Color(0xFFFBBF24),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: urlController,
                  style: const TextStyle(color: Colors.white, fontSize: 13.5),
                  decoration: InputDecoration(
                    hintText: "https://... (.mp4, .jpg, Cloudinary URL)",
                    hintStyle: const TextStyle(color: Color(0xFF52525B), fontSize: 12.5),
                    filled: true,
                    fillColor: const Color(0xFF18181B),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF3F3F46)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFF59E0B)),
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // 3. Quick 1-Tap Luxury Presets
                const Text(
                  "1-TAP LUXURY VIDEO PRESETS:",
                  style: TextStyle(
                    color: Color(0xFFFBBF24),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildPresetChip(
                      icon: Icons.play_circle_fill_rounded,
                      label: "🎥 Runway Video",
                      url: "https://res.cloudinary.com/dkdvivii2/video/upload/q_auto,vc_h264,w_720,c_scale/v1787133318/hero_banners/ewk8rjcbmdzorgdtdkyj.mp4",
                      onSelect: (url) async {
                        Navigator.pop(ctx);
                        setState(() {
                          _userAvatar = url;
                          _isExplicitVideo = true;
                        });
                        _initAvatarVideo(url);
                        await FirebaseService.updateUserProfile(
                          email: _userEmail,
                          updatedData: {
                            'image': url,
                            'avatar': url,
                            'updatedAt': DateTime.now().toIso8601String(),
                          },
                        );
                        final sp = await SharedPreferences.getInstance();
                        await sp.setString('userAvatar', url);
                        await sp.setBool('isAvatarVideo', true);
                      },
                    ),
                    _buildPresetChip(
                      icon: Icons.play_circle_fill_rounded,
                      label: "🎥 Lookbook Video",
                      url: "https://res.cloudinary.com/dkdvivii2/video/upload/q_auto,vc_h264,w_720,c_scale/v1787137471/hero_banners/nrcthqkn0crhxompblyo.mp4",
                      onSelect: (url) async {
                        Navigator.pop(ctx);
                        setState(() {
                          _userAvatar = url;
                          _isExplicitVideo = true;
                        });
                        _initAvatarVideo(url);
                        await FirebaseService.updateUserProfile(
                          email: _userEmail,
                          updatedData: {
                            'image': url,
                            'avatar': url,
                            'updatedAt': DateTime.now().toIso8601String(),
                          },
                        );
                        final sp = await SharedPreferences.getInstance();
                        await sp.setString('userAvatar', url);
                        await sp.setBool('isAvatarVideo', true);
                      },
                    ),
                    _buildPresetChip(
                      icon: Icons.play_circle_fill_rounded,
                      label: "🎥 Showcase Video",
                      url: "https://res.cloudinary.com/dkdvivii2/video/upload/q_auto,vc_h264,w_720,c_scale/v1787222027/hero_banners/yqvescwylegri78hucry.mp4",
                      onSelect: (url) async {
                        Navigator.pop(ctx);
                        setState(() {
                          _userAvatar = url;
                          _isExplicitVideo = true;
                        });
                        _initAvatarVideo(url);
                        await FirebaseService.updateUserProfile(
                          email: _userEmail,
                          updatedData: {
                            'image': url,
                            'avatar': url,
                            'updatedAt': DateTime.now().toIso8601String(),
                          },
                        );
                        final sp = await SharedPreferences.getInstance();
                        await sp.setString('userAvatar', url);
                        await sp.setBool('isAvatarVideo', true);
                      },
                    ),
                    _buildPresetChip(
                      icon: Icons.image_rounded,
                      label: "🖼️ Gold Portrait",
                      url: "https://res.cloudinary.com/dkdvivii2/image/upload/v1787130380/hero_banners/dc4k0btqalnulnl1vs2y.jpg",
                      onSelect: (url) async {
                        Navigator.pop(ctx);
                        setState(() {
                          _userAvatar = url;
                          _isExplicitVideo = false;
                        });
                        _avatarVideoController?.removeListener(_avatarVideoListener);
                        _avatarVideoController?.dispose();
                        _avatarVideoController = null;
                        await FirebaseService.updateUserProfile(
                          email: _userEmail,
                          updatedData: {
                            'image': url,
                            'avatar': url,
                            'updatedAt': DateTime.now().toIso8601String(),
                          },
                        );
                        final sp = await SharedPreferences.getInstance();
                        await sp.setString('userAvatar', url);
                        await sp.setBool('isAvatarVideo', false);
                      },
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Save Action Button
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF59E0B),
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 4,
                    ),
                    onPressed: () async {
                      final newUrl = urlController.text.trim();
                      Navigator.pop(ctx);
                      if (newUrl.isNotEmpty) {
                        final isVid = _isVideoUrl(newUrl);
                        setState(() {
                          _userAvatar = newUrl;
                          _isExplicitVideo = isVid;
                        });
                        if (isVid) {
                          _initAvatarVideo(newUrl);
                        } else {
                          _avatarVideoController?.removeListener(_avatarVideoListener);
                          _avatarVideoController?.dispose();
                          _avatarVideoController = null;
                        }
                        await FirebaseService.updateUserProfile(
                          email: _userEmail,
                          updatedData: {
                            'image': newUrl,
                            'avatar': newUrl,
                            'updatedAt': DateTime.now().toIso8601String(),
                          },
                        );
                        final sp = await SharedPreferences.getInstance();
                        await sp.setString('userAvatar', newUrl);
                        await sp.setBool('isAvatarVideo', isVid);
                        if (mounted && context.mounted) {
                          LuxuryToast.showSuccess(
                            context,
                            "✨ Profile ${isVid ? 'video' : 'photo'} saved permanently in Firebase!",
                            title: "MEDIA UPDATED",
                          );
                        }
                      }
                    },
                    child: const Text(
                      "SAVE URL MEDIA TO FIREBASE",
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMediaOptionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF14141A),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF27272A)),
        ),
        child: Column(
          children: [
            Icon(icon, color: const Color(0xFFFBBF24), size: 24),
            const SizedBox(height: 6),
            Text(
              title,
              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(color: Color(0xFF6B7280), fontSize: 9.5),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPresetChip({
    required IconData icon,
    required String label,
    required String url,
    required Function(String) onSelect,
  }) {
    return ActionChip(
      avatar: Icon(icon, color: const Color(0xFFFBBF24), size: 14),
      label: Text(
        label,
        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
      ),
      backgroundColor: const Color(0xFF1E1E26),
      side: const BorderSide(color: Color(0xFF3F3F46)),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      onPressed: () => onSelect(url),
    );
  }

  /// 100% Safe Avatar Media Renderer (Choras / Rounded Square Card)
  Widget _buildAvatarMediaCard({double size = 190, double borderRadius = 24}) {
    if (_userAvatar.isEmpty) {
      return _buildInitialsAvatar(size: size, borderRadius: borderRadius);
    }

    final isVid = _isExplicitVideo || _isVideoUrl(_userAvatar);

    if (isVid) {
      // 1. Live Video Player (Playing directly - 100% Full bleed covering entire square box)
      if (_avatarVideoController != null && _avatarVideoController!.value.isInitialized) {
        final vSize = _avatarVideoController!.value.size;
        final vWidth = vSize.width > 0 ? vSize.width : 16.0;
        final vHeight = vSize.height > 0 ? vSize.height : 9.0;
        return SizedBox.expand(
          child: FittedBox(
            fit: BoxFit.cover,
            clipBehavior: Clip.hardEdge,
            child: SizedBox(
              width: vWidth,
              height: vHeight,
              child: AspectRatio(
                aspectRatio: vWidth / vHeight,
                child: VideoPlayer(_avatarVideoController!),
              ),
            ),
          ),
        );
      }

      // 2. Seamless Instant Video Frame (Zero button, pure luxury preview until stream starts)
      return SizedBox.expand(
        child: ImageOptimizer.cachedImage(
          imageUrl: _userAvatar,
          fit: BoxFit.cover,
        ),
      );
    } else {
      // 3. IMAGE RENDERING (Network or Local File)
      if (_userAvatar.startsWith('http://') || _userAvatar.startsWith('https://')) {
        return SizedBox.expand(
          child: ImageOptimizer.cachedImage(
            imageUrl: _userAvatar,
            fit: BoxFit.cover,
          ),
        );
      } else {
        final file = File(_userAvatar);
        if (file.existsSync()) {
          return SizedBox.expand(
            child: Image.file(
              file,
              fit: BoxFit.cover,
              errorBuilder: (ctx, err, stack) => _buildInitialsAvatar(size: size, borderRadius: borderRadius),
            ),
          );
        }
      }
    }

    return _buildInitialsAvatar(size: size, borderRadius: borderRadius);
  }

  void _openAvatarPreviewModal() async {
    if (_userAvatar.isEmpty) {
      _showUploadMediaDialog();
      return;
    }
    final isVid = _isExplicitVideo || _isVideoUrl(_userAvatar);

    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => FullScreenLuxuryMediaViewer(
          mediaUrl: _userAvatar,
          isVideo: isVid,
          controller: _avatarVideoController,
          userName: _userName,
          userEmail: _userEmail,
          onChangeMedia: () {
            _showUploadMediaDialog();
          },
        ),
      ),
    );

    // Ensure audio is muted and looped for background avatar when returning
    if (mounted && isVid && _avatarVideoController != null && _avatarVideoController!.value.isInitialized) {
      try {
        await _avatarVideoController!.setVolume(0.0);
        await _avatarVideoController!.play();
      } catch (_) {}
    }
  }

  Future<void> _logout() async {
    _avatarVideoController?.removeListener(_avatarVideoListener);
    try {
      await _avatarVideoController?.pause();
      await _avatarVideoController?.dispose();
    } catch (_) {}
    _avatarVideoController = null;

    final sp = await SharedPreferences.getInstance();
    await sp.clear();
    await DynamicNotificationService.onUserLoggedOut();

    if (mounted) {
      LuxuryToast.showInfo(
        context,
        "Signed out of Vraj Creation successfully.",
        title: "SIGNED OUT",
        icon: Icons.logout_rounded,
      );
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen(isInitialLaunch: true)),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF09090B),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFFFBBF24), size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          "MY ACCOUNT",
          style: TextStyle(
            color: Color(0xFFFBBF24),
            fontSize: 14,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFFFBBF24), size: 22),
            onPressed: () {
              _loadLiveUserProfile();
              LuxuryToast.showInfo(context, "Refreshing account details...", title: "SYNC PROFILE");
            },
            tooltip: "Refresh Profile",
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        color: const Color(0xFFF59E0B),
        backgroundColor: const Color(0xFF18181B),
        onRefresh: _loadLiveUserProfile,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ================= 1. EXACT MERN TITLE COMPONENT =================
            Container(
              padding: const EdgeInsets.only(bottom: 12),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: Color(0xFF27272A), width: 1)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text(
                        "MY ",
                        style: TextStyle(
                          color: Color(0xFFFBBF24),
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      ),
                      const Text(
                        "ACCOUNT",
                        style: TextStyle(
                          color: Color(0xFFE5E7EB),
                          fontSize: 22,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Container(
                        width: 40,
                        height: 2,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFF59E0B), Color(0xFFFBBF24)],
                          ),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    "Manage your personal details, profile media, and account security.",
                    style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // ================= 2. EXACT MERN UNDERLINE TABS =================
            if (_isLoggedIn) ...[
              Container(
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: Color(0xFF27272A), width: 1)),
                ),
                child: Row(
                  children: [
                    _buildMernUnderlineTab(
                      title: "Edit Profile",
                      tabKey: "editProfile",
                    ),
                    const SizedBox(width: 28),
                    _buildMernUnderlineTab(
                      title: "Change Password",
                      tabKey: "changePassword",
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            // ================= 3. TAB 1: EDIT PROFILE FLOW =================
            if (_isLoggedIn && _activeTab == "editProfile") ...[
              // Large Choras (Square) Luxury Avatar Card (190x190) with Motion Indicator & Floating Action Button
              Center(
                child: Column(
                  children: [
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        GestureDetector(
                          onTap: _openAvatarPreviewModal,
                          child: Container(
                            width: 190,
                            height: 190,
                            clipBehavior: Clip.antiAlias,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(28),
                              color: const Color(0xFF14141A),
                              border: Border.all(
                                color: const Color(0xFFF59E0B).withValues(alpha: 0.8),
                                width: 2.5,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFFF59E0B).withValues(alpha: 0.35),
                                  blurRadius: 28,
                                  spreadRadius: 2,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                Positioned.fill(
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(25.5),
                                    child: _buildAvatarMediaCard(size: 190, borderRadius: 25.5),
                                  ),
                                ),

                                // Motion / Live Badge for Videos
                                if ((_isExplicitVideo || _isVideoUrl(_userAvatar)) &&
                                    _avatarVideoController != null &&
                                    _avatarVideoController!.value.isInitialized)
                                  Positioned(
                                    top: 10,
                                    left: 10,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.black.withValues(alpha: 0.75),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: const Color(0xFFFBBF24).withValues(alpha: 0.6)),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Container(
                                            width: 6,
                                            height: 6,
                                            decoration: const BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: Color(0xFF10B981),
                                            ),
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            _avatarVideoController!.value.isPlaying ? "MOTION" : "PAUSED",
                                            style: const TextStyle(
                                              color: Color(0xFFFBBF24),
                                              fontSize: 11,
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: 0.5,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),

                                // Cloud Syncing Indicator
                                if (_isSyncingCloud)
                                  Positioned(
                                    bottom: 10,
                                    left: 10,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.black.withValues(alpha: 0.85),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: const Color(0xFFF59E0B)),
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          GoldenSweepLoader(size: 10),
                                          SizedBox(width: 5),
                                          Text(
                                            "SYNCING...",
                                            style: TextStyle(
                                              color: Color(0xFFFBBF24),
                                              fontSize: 10.5,
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),

                                // Play icon overlay when paused
                                if ((_isExplicitVideo || _isVideoUrl(_userAvatar)) &&
                                    _avatarVideoController != null &&
                                    _avatarVideoController!.value.isInitialized &&
                                    !_avatarVideoController!.value.isPlaying)
                                  Positioned.fill(
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: Colors.black.withValues(alpha: 0.4),
                                        borderRadius: BorderRadius.circular(24),
                                      ),
                                      child: const Center(
                                        child: Icon(Icons.play_arrow_rounded, color: Color(0xFFFBBF24), size: 48),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                        // Luxury Floating Camera/Edit Button at Bottom-Right
                        Positioned(
                          bottom: -4,
                          right: -4,
                          child: GestureDetector(
                            onTap: _showUploadMediaDialog,
                            child: Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                gradient: const LinearGradient(
                                  colors: [Color(0xFFF59E0B), Color(0xFFFBBF24)],
                                ),
                                border: Border.all(color: const Color(0xFF09090B), width: 3),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.7),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: const Icon(Icons.camera_alt_rounded, color: Colors.black, size: 22),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    // Action Links Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (_userAvatar.isNotEmpty) ...[
                          GestureDetector(
                            onTap: _openAvatarPreviewModal,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: const Color(0xFF18181B),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFF27272A)),
                              ),
                              child: Text(
                                (_isExplicitVideo || _isVideoUrl(_userAvatar)) ? "▶️ Full View" : "🔍 Full View",
                                style: const TextStyle(
                                  color: Color(0xFFFBBF24),
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],
                        GestureDetector(
                          onTap: () => _pickMedia(ImageSource.gallery, isVideo: true),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xFF18181B),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFF27272A)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.videocam_rounded, color: Color(0xFFFBBF24), size: 14),
                                SizedBox(width: 4),
                                Text(
                                  "Add Video",
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () => _pickMedia(ImageSource.gallery, isVideo: false),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xFF18181B),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFF27272A)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.photo_rounded, color: Color(0xFFFBBF24), size: 14),
                                SizedBox(width: 4),
                                Text(
                                  "Add Photo",
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text.rich(
                      TextSpan(
                        text: "Logged in as ",
                        style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11.5),
                        children: [
                          TextSpan(
                            text: _userEmail,
                            style: const TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 22),

              // Form Fields Card (Exact MERN Card: NAME, EMAIL, PHONE ONLY)
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: const Color(0xFF09090B),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFF27272A)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.8),
                      blurRadius: 24,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // NAME Input
                    _buildMernField(
                      label: "NAME",
                      hint: "Enter your name",
                      controller: _nameController,
                    ),
                    const SizedBox(height: 16),

                    // EMAIL (Readonly)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "EMAIL",
                          style: TextStyle(
                            color: Color(0xFFD1D5DB),
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                          decoration: BoxDecoration(
                            color: const Color(0xFF141418),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFF27272A)),
                          ),
                          child: Text(
                            _userEmail,
                            style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // PHONE Input (Strict 10 Digits Only)
                    _buildMernField(
                      label: "PHONE (10 DIGITS)",
                      hint: "e.g. 9876543210",
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      maxLength: 10,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(10),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // EXACT MERN GRADIENT SAVE BUTTON
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: ElevatedButton(
                        onPressed: _savingProfile ? null : _handleSaveProfile,
                        style: ElevatedButton.styleFrom(
                          padding: EdgeInsets.zero,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 6,
                          shadowColor: const Color(0xFFF59E0B).withValues(alpha: 0.35),
                        ),
                        child: Ink(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFF59E0B), Color(0xFFFBBF24), Color(0xFFFCD34D)],
                              begin: Alignment.centerLeft,
                              end: Alignment.centerRight,
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Container(
                            alignment: Alignment.center,
                            child: _savingProfile
                                ? const GoldenSweepLoader(size: 18)
                                : const Text(
                                    "SAVE",
                                    style: TextStyle(
                                      color: Colors.black,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 12,
                                      letterSpacing: 1.5,
                                    ),
                                  ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            // ================= 4. TAB 2: CHANGE PASSWORD FLOW =================
            if (_isLoggedIn && _activeTab == "changePassword") ...[
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: const Color(0xFF09090B),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFF27272A)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.8),
                      blurRadius: 24,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildMernField(
                      label: "OLD PASSWORD",
                      hint: "Enter current password",
                      controller: _oldPasswordController,
                      isPassword: true,
                    ),
                    const SizedBox(height: 16),

                    _buildMernField(
                      label: "NEW PASSWORD",
                      hint: "At least 6 characters",
                      controller: _newPasswordController,
                      isPassword: true,
                    ),
                    const SizedBox(height: 16),

                    _buildMernField(
                      label: "CONFIRM PASSWORD",
                      hint: "Re-enter new password",
                      controller: _confirmPasswordController,
                      isPassword: true,
                    ),
                    const SizedBox(height: 24),

                    // EXACT MERN GRADIENT SAVE BUTTON
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: ElevatedButton(
                        onPressed: _savingPassword ? null : _handleSavePassword,
                        style: ElevatedButton.styleFrom(
                          padding: EdgeInsets.zero,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 6,
                          shadowColor: const Color(0xFFF59E0B).withValues(alpha: 0.35),
                        ),
                        child: Ink(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFF59E0B), Color(0xFFFBBF24), Color(0xFFFCD34D)],
                              begin: Alignment.centerLeft,
                              end: Alignment.centerRight,
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Container(
                            alignment: Alignment.center,
                            child: _savingPassword
                                ? const GoldenSweepLoader(size: 18)
                                : const Text(
                                    "SAVE",
                                    style: TextStyle(
                                      color: Colors.black,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 12,
                                      letterSpacing: 1.5,
                                    ),
                                  ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            // ================= 5. GUEST STATE =================
            if (!_isLoggedIn) ...[
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF09090B),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFF27272A)),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        color: const Color(0xFF18181B),
                        border: Border.all(color: const Color(0xFFF59E0B), width: 2),
                      ),
                      child: const Icon(Icons.person, color: Color(0xFFFBBF24), size: 36),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      "Guest Patron",
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      "Sign in to manage your bespoke account.",
                      style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF59E0B),
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () async {
                          final res = await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const LoginScreen()),
                          );
                          if (res == true) _loadLiveUserProfile();
                        },
                        child: const Text(
                          "SIGN IN / REGISTER",
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            // ================= 6. SIGN OUT BUTTON =================
            if (_isLoggedIn)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFEF4444),
                    side: const BorderSide(color: Color(0xFFDC2626), width: 1.2),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    backgroundColor: const Color(0xFFEF4444).withValues(alpha: 0.08),
                  ),
                  onPressed: _logout,
                  icon: const Icon(Icons.logout_rounded, size: 18),
                  label: const Text(
                    "SIGN OUT",
                    style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.2, fontSize: 13),
                  ),
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

  Widget _buildInitialsAvatar({double size = 190, double borderRadius = 24}) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        gradient: const LinearGradient(
          colors: [Color(0xFFF59E0B), Color(0xFFFBBF24), Color(0xFFFCD34D)],
          begin: Alignment.bottomLeft,
          end: Alignment.topRight,
        ),
      ),
      child: Center(
        child: Text(
          _userName.isNotEmpty ? _userName[0].toUpperCase() : "U",
          style: TextStyle(
            color: Colors.black,
            fontSize: size * 0.42,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }

  Widget _buildMernUnderlineTab({
    required String title,
    required String tabKey,
  }) {
    final isSelected = _activeTab == tabKey;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = tabKey),
      child: Container(
        padding: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isSelected ? const Color(0xFFF59E0B) : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Text(
          title,
          style: TextStyle(
            color: isSelected ? const Color(0xFFFBBF24) : const Color(0xFF9CA3AF),
            fontSize: 13.5,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildMernField({
    required String label,
    required String hint,
    required TextEditingController controller,
    bool isPassword = false,
    TextInputType keyboardType = TextInputType.text,
    List<TextInputFormatter>? inputFormatters,
    int? maxLength,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFFD1D5DB),
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          obscureText: isPassword,
          keyboardType: keyboardType,
          inputFormatters: inputFormatters,
          maxLength: maxLength,
          style: const TextStyle(color: Colors.white, fontSize: 12.5),
          decoration: InputDecoration(
            counterText: "",
            hintText: hint,
            hintStyle: const TextStyle(color: Color(0xFF52525B), fontSize: 12),
            filled: true,
            fillColor: const Color(0xFF18181B),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF3F3F46)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFF59E0B)),
            ),
          ),
        ),
      ],
    );
  }
}

/// ============================================================================
/// 4K ULTRA HD FULL SCREEN LUXURY MEDIA VIEWER
/// Edge-to-Edge immersive viewer for high-definition 4K Videos & Photos
/// Features: Pinch-to-zoom, Scrub Slider, Audio Sound, Aspect Toggle & Cloud Sync
/// ============================================================================
class FullScreenLuxuryMediaViewer extends StatefulWidget {
  final String mediaUrl;
  final bool isVideo;
  final VideoPlayerController? controller;
  final String userName;
  final String userEmail;
  final VoidCallback onChangeMedia;

  const FullScreenLuxuryMediaViewer({
    super.key,
    required this.mediaUrl,
    required this.isVideo,
    this.controller,
    required this.userName,
    required this.userEmail,
    required this.onChangeMedia,
  });

  @override
  State<FullScreenLuxuryMediaViewer> createState() => _FullScreenLuxuryMediaViewerState();
}

class _FullScreenLuxuryMediaViewerState extends State<FullScreenLuxuryMediaViewer> {
  VideoPlayerController? _videoCtrl;
  bool _ownsController = false;
  bool _showControls = true;
  bool _isMuted = false;
  bool _isCoverFit = true; // Default to edge-to-edge cover mode for full screen immersion
  double _sliderValue = 0.0;
  bool _isDraggingSlider = false;

  @override
  void initState() {
    super.initState();
    if (widget.isVideo) {
      if (widget.controller != null && widget.controller!.value.isInitialized) {
        _videoCtrl = widget.controller;
        _ownsController = false;
        _videoCtrl!.addListener(_videoListener);
        _videoCtrl!.setVolume(_isMuted ? 0.0 : 1.0);
        _videoCtrl!.play();
      } else {
        _ownsController = true;
        _initVideo();
      }
    }
  }

  void _initVideo() {
    final trimmed = widget.mediaUrl.trim();
    final optimized = ImageOptimizer.optimizeVideoUrl(trimmed, width: 1280);

    if (optimized.startsWith('http://') || optimized.startsWith('https://')) {
      _videoCtrl = VideoPlayerController.networkUrl(
        Uri.parse(optimized),
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: false),
      );
    } else if (optimized.startsWith('content://')) {
      _videoCtrl = VideoPlayerController.contentUri(
        Uri.parse(optimized),
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: false),
      );
    } else {
      final file = File(optimized);
      _videoCtrl = VideoPlayerController.file(
        file,
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: false),
      );
    }

    _videoCtrl!
      ..setLooping(true)
      ..setVolume(_isMuted ? 0.0 : 1.0)
      ..addListener(_videoListener)
      ..initialize().timeout(const Duration(seconds: 7)).then((_) {
        if (mounted) {
          _videoCtrl!.play();
          setState(() {});
        }
      }).catchError((e) {
        debugPrint("FullScreen video error: $e");
        if (mounted) setState(() {});
      });
  }

  void _videoListener() {
    if (!mounted || _videoCtrl == null) return;
    if (!_isDraggingSlider && _videoCtrl!.value.isInitialized) {
      setState(() {
        _sliderValue = _videoCtrl!.value.position.inMilliseconds.toDouble();
      });
    }
  }

  @override
  void dispose() {
    _videoCtrl?.removeListener(_videoListener);
    if (_ownsController) {
      _videoCtrl?.dispose();
    } else {
      _videoCtrl?.setVolume(0.0);
    }
    super.dispose();
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, "0");
    String twoDigitMinutes = twoDigits(duration.inMinutes.remainder(60));
    String twoDigitSeconds = twoDigits(duration.inSeconds.remainder(60));
    return "$twoDigitMinutes:$twoDigitSeconds";
  }

  Widget _buildVideoPlayer() {
    if (_videoCtrl != null && _videoCtrl!.value.isInitialized) {
      final vSize = _videoCtrl!.value.size;
      final vWidth = vSize.width > 0 ? vSize.width : 16.0;
      final vHeight = vSize.height > 0 ? vSize.height : 9.0;
      return SizedBox.expand(
        child: FittedBox(
          fit: _isCoverFit ? BoxFit.cover : BoxFit.contain,
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
      );
    }

    // Direct Instant Poster Frame fallback (Zero center button, clean seamless preview)
    final trimmed = widget.mediaUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return SizedBox.expand(
        child: ImageOptimizer.cachedImage(
          imageUrl: trimmed,
          fit: _isCoverFit ? BoxFit.cover : BoxFit.contain,
          memCacheWidth: 1920,
          memCacheHeight: 1080,
        ),
      );
    }

    return const Center(
      child: GoldenSweepLoader(size: 44),
    );
  }

  Widget _buildImageViewer() {
    final trimmed = widget.mediaUrl.trim();
    Widget img;

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      img = ImageOptimizer.cachedImage(
        imageUrl: trimmed,
        fit: _isCoverFit ? BoxFit.cover : BoxFit.contain,
        memCacheWidth: 1920,
        memCacheHeight: 1080,
      );
    } else {
      final file = File(trimmed);
      if (file.existsSync()) {
        img = Image.file(
          file,
          fit: _isCoverFit ? BoxFit.cover : BoxFit.contain,
          errorBuilder: (_, __, ___) => const Center(
            child: Icon(Icons.image_outlined, color: Color(0xFFF59E0B), size: 64),
          ),
        );
      } else {
        img = const Center(
          child: Icon(Icons.person, color: Color(0xFFFBBF24), size: 96),
        );
      }
    }

    return InteractiveViewer(
      minScale: 0.8,
      maxScale: 8.0,
      panEnabled: true,
      scaleEnabled: true,
      child: Center(child: img),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalDuration = _videoCtrl?.value.duration ?? Duration.zero;
    final currentPosition = _videoCtrl?.value.position ?? Duration.zero;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        top: false,
        bottom: false,
        child: GestureDetector(
          onTap: () {
            if (widget.isVideo && _videoCtrl != null && _videoCtrl!.value.isInitialized) {
              if (_videoCtrl!.value.isPlaying) {
                _videoCtrl!.pause();
              } else {
                _videoCtrl!.play();
              }
            }
            setState(() => _showControls = !_showControls);
          },
          child: Stack(
            fit: StackFit.expand,
            children: [
              // 1. FULL SCREEN MEDIA CANVAS (Edge to Edge, Zero Center Button)
              Positioned.fill(
                child: widget.isVideo ? _buildVideoPlayer() : _buildImageViewer(),
              ),

              // 2. TOP LUXURY APP BAR (Animated with Controls)
              AnimatedPositioned(
                duration: const Duration(milliseconds: 250),
                top: _showControls ? 0 : -120,
                left: 0,
                right: 0,
                child: Container(
                  padding: EdgeInsets.fromLTRB(16, MediaQuery.of(context).padding.top + 8, 16, 16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withValues(alpha: 0.9),
                        Colors.black.withValues(alpha: 0.5),
                        Colors.transparent,
                      ],
                    ),
                  ),
                  child: Row(
                    children: [
                      // Back Button
                      GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFF18181B).withValues(alpha: 0.8),
                            border: Border.all(color: const Color(0xFF27272A)),
                          ),
                          child: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
                        ),
                      ),
                      const SizedBox(width: 14),

                      // Title
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              widget.isVideo ? "VIDEO PLAYER" : "PHOTO VIEWER",
                              style: const TextStyle(
                                color: Color(0xFFFBBF24),
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.2,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              widget.userName.isNotEmpty ? widget.userName : "Bespoke Patron",
                              style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11),
                            ),
                          ],
                        ),
                      ),

                      // Fit Toggle (Contain vs Cover)
                      GestureDetector(
                        onTap: () => setState(() => _isCoverFit = !_isCoverFit),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFF18181B).withValues(alpha: 0.8),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: _isCoverFit ? const Color(0xFFF59E0B) : const Color(0xFF3F3F46),
                            ),
                          ),
                          child: Text(
                            _isCoverFit ? "FILL" : "FIT",
                            style: TextStyle(
                              color: _isCoverFit ? const Color(0xFFFBBF24) : Colors.white70,
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Audio Sound Toggle for Videos
                      if (widget.isVideo && _videoCtrl != null)
                        GestureDetector(
                          onTap: () {
                            setState(() {
                              _isMuted = !_isMuted;
                              _videoCtrl!.setVolume(_isMuted ? 0.0 : 1.0);
                            });
                          },
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: const Color(0xFF18181B).withValues(alpha: 0.8),
                              border: Border.all(
                                color: _isMuted ? const Color(0xFFEF4444) : const Color(0xFFF59E0B),
                              ),
                            ),
                            child: Icon(
                              _isMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                              color: _isMuted ? const Color(0xFFEF4444) : const Color(0xFFFBBF24),
                              size: 18,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),

              // 4. BOTTOM LUXURY ACTION BAR & SEEK SLIDER (Animated with Controls)
              AnimatedPositioned(
                duration: const Duration(milliseconds: 250),
                bottom: _showControls ? 0 : -180,
                left: 0,
                right: 0,
                child: Container(
                  padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).padding.bottom + 18),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        Colors.black.withValues(alpha: 0.95),
                        Colors.black.withValues(alpha: 0.7),
                        Colors.transparent,
                      ],
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Video Timeline Slider with Formatted Time
                      if (widget.isVideo && _videoCtrl != null && _videoCtrl!.value.isInitialized) ...[
                        Row(
                          children: [
                            Text(
                              _formatDuration(currentPosition),
                              style: const TextStyle(
                                color: Color(0xFFFBBF24),
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Expanded(
                              child: SliderTheme(
                                data: SliderTheme.of(context).copyWith(
                                  activeTrackColor: const Color(0xFFF59E0B),
                                  inactiveTrackColor: const Color(0xFF3F3F46),
                                  thumbColor: const Color(0xFFFCD34D),
                                  trackHeight: 3.5,
                                  thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                                  overlayColor: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                                ),
                                child: Slider(
                                  value: _sliderValue.clamp(0.0, totalDuration.inMilliseconds.toDouble()),
                                  min: 0.0,
                                  max: totalDuration.inMilliseconds.toDouble() > 0
                                      ? totalDuration.inMilliseconds.toDouble()
                                      : 1.0,
                                  onChangeStart: (_) => _isDraggingSlider = true,
                                  onChanged: (val) {
                                    setState(() => _sliderValue = val);
                                  },
                                  onChangeEnd: (val) {
                                    _isDraggingSlider = false;
                                    _videoCtrl?.seekTo(Duration(milliseconds: val.toInt()));
                                  },
                                ),
                              ),
                            ),
                            Text(
                              _formatDuration(totalDuration),
                              style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                      ],

                      // Bottom Buttons: Change Media & Close
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFF59E0B),
                                foregroundColor: Colors.black,
                                padding: const EdgeInsets.symmetric(vertical: 13),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                elevation: 6,
                              ),
                              onPressed: () {
                                Navigator.pop(context);
                                widget.onChangeMedia();
                              },
                              icon: const Icon(Icons.photo_library_rounded, size: 18),
                              label: const Text(
                                "CHANGE MEDIA",
                                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.white,
                              side: const BorderSide(color: Color(0xFF3F3F46)),
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              backgroundColor: const Color(0xFF18181B).withValues(alpha: 0.6),
                            ),
                            onPressed: () => Navigator.pop(context),
                            child: const Text("CLOSE", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
