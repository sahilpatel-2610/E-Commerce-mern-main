import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product_model.dart';
import '../screens/orders_screen.dart';
import '../screens/product_detail_screen.dart';
import 'firebase_service.dart';

enum NotificationType {
  productAdded,
  productUpdated,
  categoryUpdated,
  orderStatus,
  bannerDrop,
  adminBroadcast,
  systemAlert,
}

class AppNotificationItem {
  final String id;
  final String title;
  final String message;
  final NotificationType type;
  final DateTime timestamp;
  final Map<String, dynamic>? data;
  bool isRead;

  AppNotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.timestamp,
    this.data,
    this.isRead = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'message': message,
        'type': type.name,
        'timestamp': timestamp.toIso8601String(),
        'data': data,
        'isRead': isRead,
      };

  factory AppNotificationItem.fromJson(Map<String, dynamic> json) {
    NotificationType parsedType = NotificationType.adminBroadcast;
    final rawType = (json['type'] ?? '').toString();
    for (var t in NotificationType.values) {
      if (t.name == rawType) {
        parsedType = t;
        break;
      }
    }
    return AppNotificationItem(
      id: json['id']?.toString() ?? 'notif_${DateTime.now().millisecondsSinceEpoch}',
      title: json['title']?.toString() ?? 'Notification',
      message: json['message']?.toString() ?? '',
      type: parsedType,
      timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? '') ?? DateTime.now(),
      data: json['data'] is Map ? Map<String, dynamic>.from(json['data'] as Map) : null,
      isRead: json['isRead'] == true,
    );
  }
}

class DynamicNotificationService {
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  static final ValueNotifier<int> unreadCount = ValueNotifier<int>(0);
  static final ValueNotifier<List<AppNotificationItem>> notifications =
      ValueNotifier<List<AppNotificationItem>>([]);

  static Timer? _pollingTimer;
  static bool _isInitialized = false;
  static bool _isBaselineReady = false;

  // Track known states to detect live edits/additions
  static final Set<String> _knownProductIds = {};
  static final Map<String, double> _knownProductPrices = {};
  static final Map<String, String> _knownOrderStatuses = {};
  static final Set<String> _processedBroadcastIds = {};
  static final Set<String> _knownBannerIds = {};

  static OverlayEntry? _currentOverlayEntry;
  static Timer? _overlayTimer;

  static String? _activeUserEmail;
  static int _sessionStartTime = DateTime.now().millisecondsSinceEpoch;

  static String _getNotifStorageKey() =>
      'app_notifications_list_${_activeUserEmail ?? "guest"}';
  static String _getProcessedStorageKey() =>
      'processed_broadcast_ids_${_activeUserEmail ?? "guest"}';

  // Initialize service
  static Future<void> initialize() async {
    if (_isInitialized) return;
    _isInitialized = true;
    _sessionStartTime = DateTime.now().millisecondsSinceEpoch;

    final sp = await SharedPreferences.getInstance();
    final savedEmail = sp.getString('userEmail')?.trim().toLowerCase() ?? '';
    final isLoggedIn = sp.getBool('isLoggedIn') ?? (savedEmail.isNotEmpty);

    if (isLoggedIn && savedEmail.isNotEmpty) {
      _activeUserEmail = savedEmail;
    } else {
      _activeUserEmail = null;
    }

    await _loadSavedNotifications();

    // Initial baseline sync: Mark all existing Firestore documents as processed
    await _syncBaselineData();

    // Start live Admin broadcast sync (every 45 seconds)
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 45), (_) async {
      try {
        await _checkAdminBroadcasts(isInitial: false);
      } catch (e) {
        debugPrint('Dynamic notification polling error: $e');
      }
    });
  }

  /// Hook called immediately when a user signs in or creates a new account
  static Future<void> onUserLoggedIn(String email) async {
    _activeUserEmail = email.trim().toLowerCase();
    _sessionStartTime = DateTime.now().millisecondsSinceEpoch;
    _processedBroadcastIds.clear();

    await _loadSavedNotifications();
    await _syncBaselineData();
    debugPrint('👤 [NOTIFICATIONS] User session initialized for: $_activeUserEmail (Session Time: $_sessionStartTime)');
  }

  /// Hook called when user signs out
  static Future<void> onUserLoggedOut() async {
    _activeUserEmail = null;
    notifications.value = [];
    unreadCount.value = 0;
    _processedBroadcastIds.clear();
    _sessionStartTime = DateTime.now().millisecondsSinceEpoch;
    debugPrint('🚪 [NOTIFICATIONS] User session cleared on logout.');
  }

  static void dispose() {
    _pollingTimer?.cancel();
    _overlayTimer?.cancel();
    _currentOverlayEntry?.remove();
    _currentOverlayEntry = null;
  }

  // Load past notifications from user-specific SharedPreferences
  static Future<void> _loadSavedNotifications() async {
    try {
      final sp = await SharedPreferences.getInstance();
      final raw = sp.getString(_getNotifStorageKey());
      if (raw != null && raw.isNotEmpty) {
        final decoded = json.decode(raw);
        if (decoded is List) {
          final loaded = <AppNotificationItem>[];
          for (final item in decoded) {
            if (item is Map) {
              try {
                loaded.add(AppNotificationItem.fromJson(Map<String, dynamic>.from(item)));
              } catch (_) {}
            }
          }
          notifications.value = loaded;
          _updateUnreadCount();
        }
      } else {
        notifications.value = [];
        _updateUnreadCount();
      }

      final procBroadcasts = sp.getStringList(_getProcessedStorageKey());
      if (procBroadcasts != null) {
        _processedBroadcastIds.addAll(procBroadcasts);
      }
    } catch (e) {
      debugPrint('Error loading notifications: $e');
    }
  }

  // Save notifications to user-specific SharedPreferences
  static Future<void> _saveNotifications() async {
    try {
      final sp = await SharedPreferences.getInstance();
      final raw = json.encode(notifications.value.map((e) => e.toJson()).toList());
      await sp.setString(_getNotifStorageKey(), raw);
      await sp.setStringList(
          _getProcessedStorageKey(), _processedBroadcastIds.toList());
      _updateUnreadCount();
    } catch (e) {
      debugPrint('Error saving notifications: $e');
    }
  }

  static void _updateUnreadCount() {
    unreadCount.value =
        notifications.value.where((n) => !n.isRead).length;
  }

  // Mark single as read
  static Future<void> markAsRead(String id) async {
    final list = List<AppNotificationItem>.from(notifications.value);
    for (var n in list) {
      if (n.id == id) {
        n.isRead = true;
        break;
      }
    }
    notifications.value = list;
    await _saveNotifications();
  }

  // Remove single notification
  static Future<void> removeNotification(String id) async {
    final list = List<AppNotificationItem>.from(notifications.value);
    list.removeWhere((n) => n.id == id);
    notifications.value = list;
    await _saveNotifications();
  }

  // Mark all as read
  static Future<void> markAllAsRead() async {
    final list = List<AppNotificationItem>.from(notifications.value);
    for (var n in list) {
      n.isRead = true;
    }
    notifications.value = list;
    await _saveNotifications();
  }

  // Clear all notifications
  static Future<void> clearAll() async {
    notifications.value = [];
    await _saveNotifications();
  }

  // Initial baseline fetch: Mark all existing documents as processed so ZERO past messages pop up
  static Future<void> _syncBaselineData() async {
    try {
      await _checkAdminBroadcasts(isInitial: true);
      await _saveNotifications();
      _isBaselineReady = true;
    } catch (e) {
      _isBaselineReady = true;
    }
  }

  // Live Firestore change detector (can be triggered on manual screen refresh)
  static Future<void> checkLiveFirestoreChanges() async {
    if (!_isBaselineReady) return;
    try {
      await Future.wait([
        _checkAdminBroadcasts(isInitial: false),
        _checkProductChanges(),
        _checkOrderChanges(),
        _checkBannerChanges(),
      ]);
    } catch (e) {
      debugPrint('Error polling Firestore changes: $e');
    }
  }

  // Helper to extract timestamp from Firestore document
  static int _extractDocTimestamp(Map<String, dynamic> doc) {
    if (doc['timestamp'] is num) return (doc['timestamp'] as num).toInt();
    if (doc['date'] is num) return (doc['date'] as num).toInt();
    if (doc['createdAt'] != null) {
      final dt = DateTime.tryParse(doc['createdAt'].toString());
      if (dt != null) return dt.millisecondsSinceEpoch;
    }
    return 0;
  }

  // 1. Direct Admin Broadcast Notifications (Real-Time Single-Source Live Sync)
  static Future<void> _checkAdminBroadcasts({bool isInitial = false}) async {
    const url = '${FirebaseService.baseUrl}/admin_notifications?pageSize=300';
    try {
      final res = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final docs = data['documents'] as List<dynamic>? ?? [];

        for (var d in docs) {
          final parsed = FirebaseService.parseDoc(d as Map<String, dynamic>);
          final id = parsed['_id']?.toString() ?? parsed['id']?.toString() ?? '';
          if (id.isEmpty) continue;

          final docTime = _extractDocTimestamp(parsed);

          // On initial app launch or if doc was created BEFORE current user session started:
          // Record as processed and NEVER pop up (No old past messages!)
          if (isInitial || (docTime > 0 && docTime < _sessionStartTime)) {
            _processedBroadcastIds.add(id);
            continue;
          }

          // If user is not logged in, do not pop up live notifications
          if (_activeUserEmail == null || _activeUserEmail!.isEmpty) {
            continue;
          }

          // Live notification created while user is logged in
          if (!_processedBroadcastIds.contains(id) && docTime >= _sessionStartTime) {
            _processedBroadcastIds.add(id);

            final title = parsed['title']?.toString() ?? '📢 VRAJ CREATION UPDATE';
            final message = parsed['message']?.toString() ??
                parsed['body']?.toString() ??
                'New dynamic update from Admin.';
            final typeStr = parsed['type']?.toString() ?? 'adminBroadcast';

            NotificationType type = NotificationType.adminBroadcast;
            if (typeStr == 'product') {
              type = title.contains('DROP') || title.contains('ADDED')
                  ? NotificationType.productAdded
                  : (title.contains('UPDATE')
                      ? NotificationType.productUpdated
                      : NotificationType.productAdded);
            } else if (typeStr == 'category' || typeStr == 'subcategory') {
              type = NotificationType.categoryUpdated;
            } else if (typeStr == 'size' || typeStr == 'weight' || typeStr == 'ram') {
              type = NotificationType.productUpdated;
            } else if (typeStr == 'order') {
              type = NotificationType.orderStatus;
            } else if (typeStr == 'banner') {
              type = NotificationType.bannerDrop;
            } else {
              type = NotificationType.adminBroadcast;
            }

            final notif = AppNotificationItem(
              id: 'admin_$id',
              title: title,
              message: message,
              type: type,
              timestamp: DateTime.now(),
              data: parsed,
            );

            debugPrint('📢 [LIVE NOTIFICATION POPPED UP] ➔ $title: $message (User: $_activeUserEmail)');
            await addNotification(notif, showTopBanner: true);
            await _saveNotifications();
          }
        }
      }
    } catch (_) {}
  }

  // 2. Product State Sync
  static Future<void> _checkProductChanges() async {
    if (!_isBaselineReady) return;
    try {
      final res = await http.get(
          Uri.parse('${FirebaseService.baseUrl}/products?pageSize=200'));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final docs = data['documents'] as List<dynamic>? ?? [];
        final currentProducts = docs
            .map((d) => Product.fromJson(
                FirebaseService.parseDoc(d as Map<String, dynamic>)))
            .toList();

        for (var p in currentProducts) {
          _knownProductIds.add(p.id);
          _knownProductPrices[p.id] = p.price;
        }
      }
    } catch (_) {}
  }

  // 3. User Order Status Changes
  static Future<void> _checkOrderChanges() async {
    if (!_isBaselineReady) return;
    try {
      final sp = await SharedPreferences.getInstance();
      final email = sp.getString('userEmail')?.trim().toLowerCase() ?? '';
      if (email.isEmpty) return;

      final allOrders = await FirebaseService.getOrders();
      for (var o in allOrders) {
        final ordEmail = (o['userEmail'] ?? o['customerEmail'] ?? (o['address'] is Map ? (o['address'] as Map)['email'] : ''))?.toString().toLowerCase() ?? '';
        if (ordEmail != email && email != 'admin' && ordEmail.isNotEmpty) {
          continue;
        }

        final id = o['orderId']?.toString() ?? o['_id']?.toString() ?? '';
        final status = o['status']?.toString() ?? 'Order Placed';
        if (id.isEmpty) continue;

        if (_knownOrderStatuses.containsKey(id)) {
          final oldStatus = _knownOrderStatuses[id];
          if (oldStatus != null && oldStatus != status) {
            _knownOrderStatuses[id] = status;

            String iconEmoji = '🚚';
            if (status == 'Delivered') iconEmoji = '🎉';
            if (status == 'Shipped') iconEmoji = '✈️';
            if (status == 'Cancelled') iconEmoji = '❌';

            final shortId = id.length > 10 ? id.substring(0, 10) : id;
            final notif = AppNotificationItem(
              id: 'order_${id}_${status}_${DateTime.now().millisecondsSinceEpoch}',
              title: '$iconEmoji ORDER STATUS UPDATED',
              message: 'Your Order #$shortId status is now "$status".',
              type: NotificationType.orderStatus,
              timestamp: DateTime.now(),
              data: {'orderId': id, 'status': status, 'order': o},
            );
            await addNotification(notif, showTopBanner: true);
            await _saveNotifications();
          }
        } else {
          _knownOrderStatuses[id] = status;
        }
      }
    } catch (e) {
      debugPrint('Order status check error: $e');
    }
  }

  // 4. Banner State Sync
  static Future<void> _checkBannerChanges() async {
    if (!_isBaselineReady) return;
    try {
      final banners = await FirebaseService.getBanners();
      for (var b in banners) {
        _knownBannerIds.add(b.id);
      }
    } catch (_) {}
  }

  // Content & Resource fingerprint cache to prevent duplicate notifications within 15 seconds
  static final Map<String, int> _recentFingerprintTimestamps = {};

  // Add notification to in-app stream & show top floating banner (Guaranteed single popup)
  static Future<void> addNotification(
    AppNotificationItem item, {
    bool showTopBanner = true,
  }) async {
    final list = List<AppNotificationItem>.from(notifications.value);
    
    // Prevent duplicate IDs
    if (list.any((n) => n.id == item.id)) return;

    final nowMs = DateTime.now().millisecondsSinceEpoch;

    // 1. Resource ID Deduping (E.g. only 1 notification per product/order within 15 seconds)
    final prodId = (item.data?['productId'] ?? item.data?['id'] ?? '')?.toString().trim() ?? '';
    if (prodId.isNotEmpty) {
      final resKey = 'resource_$prodId';
      final lastSeen = _recentFingerprintTimestamps[resKey];
      if (lastSeen != null && (nowMs - lastSeen) < 15000) {
        return; // Duplicate notification for same product within 15s - discard!
      }
      _recentFingerprintTimestamps[resKey] = nowMs;
    }

    // 2. Content & Action Fingerprint Debounce (Prevents double notifications on rapid sync)
    final fingerprint = '${item.title.trim().toLowerCase()}_${item.message.trim().toLowerCase()}';
    final lastSeenContent = _recentFingerprintTimestamps[fingerprint];
    if (lastSeenContent != null && (nowMs - lastSeenContent) < 15000) {
      return; // Duplicate content received within 15 seconds - discard!
    }
    _recentFingerprintTimestamps[fingerprint] = nowMs;

    list.insert(0, item);
    // Keep max 50 recent items
    if (list.length > 50) {
      list.removeRange(50, list.length);
    }

    notifications.value = list;
    await _saveNotifications();

    if (showTopBanner) {
      showTopFloatingBanner(item);
    }
  }

  // Display luxury in-app top drop banner
  static void showTopFloatingBanner(AppNotificationItem item) {
    try {
      final navState = navigatorKey.currentState;
      if (navState == null || !navState.mounted) return;
      final overlay = navState.overlay;
      if (overlay == null) return;

      HapticFeedback.mediumImpact();

      _overlayTimer?.cancel();
      _currentOverlayEntry?.remove();

      late OverlayEntry entry;
      entry = OverlayEntry(
        builder: (context) => _TopFloatingBannerWidget(
          item: item,
          onDismiss: () {
            entry.remove();
            if (_currentOverlayEntry == entry) {
              _currentOverlayEntry = null;
            }
          },
          onTap: () {
            entry.remove();
            if (_currentOverlayEntry == entry) {
              _currentOverlayEntry = null;
            }
            markAsRead(item.id);
            handleNotificationNavigation(item);
          },
        ),
      );

      _currentOverlayEntry = entry;
      overlay.insert(entry);

      _overlayTimer = Timer(const Duration(milliseconds: 4800), () {
        if (_currentOverlayEntry == entry) {
          try {
            entry.remove();
          } catch (_) {}
          _currentOverlayEntry = null;
        }
      });
    } catch (e) {
      debugPrint('Error showing banner: $e');
    }
  }

  // Alias for backward compatibility
  static void showTopFloatingNotification(AppNotificationItem item) {
    showTopFloatingBanner(item);
  }

  static void handleNotificationNavigation(AppNotificationItem item) {
    final nav = navigatorKey.currentState;
    if (nav == null) return;

    if (item.type == NotificationType.orderStatus) {
      nav.push(MaterialPageRoute(builder: (_) => const OrdersScreen()));
    } else if (item.data != null && item.data!['product'] != null) {
      try {
        final prod = Product.fromJson(item.data!['product']);
        nav.push(MaterialPageRoute(
            builder: (_) => ProductDetailScreen(product: prod)));
      } catch (_) {}
    }
  }
}

class _TopFloatingBannerWidget extends StatefulWidget {
  final AppNotificationItem item;
  final VoidCallback onDismiss;
  final VoidCallback onTap;

  const _TopFloatingBannerWidget({
    required this.item,
    required this.onDismiss,
    required this.onTap,
  });

  @override
  State<_TopFloatingBannerWidget> createState() =>
      _TopFloatingBannerWidgetState();
}

class _TopFloatingBannerWidgetState extends State<_TopFloatingBannerWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _slideAnimation;
  late final Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0.0, -1.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    ));

    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _dismissWithAnimation() {
    _controller.reverse().then((_) {
      widget.onDismiss();
    });
  }

  IconData _getIconForType(NotificationType type) {
    switch (type) {
      case NotificationType.productAdded:
        return Icons.auto_awesome;
      case NotificationType.productUpdated:
        return Icons.local_offer_outlined;
      case NotificationType.categoryUpdated:
        return Icons.grid_view_rounded;
      case NotificationType.orderStatus:
        return Icons.local_shipping_outlined;
      case NotificationType.bannerDrop:
        return Icons.star_rounded;
      case NotificationType.adminBroadcast:
      case NotificationType.systemAlert:
        return Icons.campaign_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;

    return Positioned(
      top: topPadding + 8,
      left: 12,
      right: 12,
      child: Material(
        color: Colors.transparent,
        child: SlideTransition(
          position: _slideAnimation,
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: GestureDetector(
              onTap: widget.onTap,
              onVerticalDragUpdate: (details) {
                if (details.primaryDelta! < -4) {
                  _dismissWithAnimation();
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A).withValues(alpha: 0.96),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.5),
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.6),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                    BoxShadow(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                      blurRadius: 12,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
                            blurRadius: 8,
                          ),
                        ],
                      ),
                      child: Icon(
                        _getIconForType(widget.item.type),
                        color: Colors.black,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  widget.item.title,
                                  style: const TextStyle(
                                    color: Color(0xFFF59E0B),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.8,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                "Just now",
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.5),
                                  fontSize: 10,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            widget.item.message,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              height: 1.25,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: _dismissWithAnimation,
                      child: Padding(
                        padding: const EdgeInsets.all(4.0),
                        child: Icon(
                          Icons.close_rounded,
                          color: Colors.white.withValues(alpha: 0.4),
                          size: 18,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
