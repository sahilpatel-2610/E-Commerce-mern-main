import 'package:flutter/material.dart';
import '../services/dynamic_notification_service.dart';

class NotificationCenterModal extends StatelessWidget {
  const NotificationCenterModal({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const NotificationCenterModal(),
    );
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final month = months[dt.month - 1];
    final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    final min = dt.minute.toString().padLeft(2, '0');
    return '${dt.day} $month, $hour:$min $period';
  }

  IconData _getIcon(NotificationType type) {
    switch (type) {
      case NotificationType.productAdded:
        return Icons.inventory_2_rounded;
      case NotificationType.productUpdated:
        return Icons.local_offer_rounded;
      case NotificationType.categoryUpdated:
        return Icons.grid_view_rounded;
      case NotificationType.orderStatus:
        return Icons.local_shipping_rounded;
      case NotificationType.bannerDrop:
        return Icons.auto_awesome_rounded;
      case NotificationType.adminBroadcast:
      case NotificationType.systemAlert:
        return Icons.notifications_active_rounded;
    }
  }

  Color _getColor(NotificationType type) {
    switch (type) {
      case NotificationType.productAdded:
        return const Color(0xFF10B981);
      case NotificationType.productUpdated:
        return const Color(0xFFF59E0B);
      case NotificationType.categoryUpdated:
        return const Color(0xFF06B6D4);
      case NotificationType.orderStatus:
        return const Color(0xFF3B82F6);
      case NotificationType.bannerDrop:
        return const Color(0xFFEC4899);
      case NotificationType.adminBroadcast:
      case NotificationType.systemAlert:
        return const Color(0xFFFBBF24);
    }
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.of(context).size.height * 0.85;

    return Container(
      height: height,
      decoration: const BoxDecoration(
        color: Color(0xFF09090D),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(
          top: BorderSide(color: Color(0xFFF59E0B), width: 1.5),
        ),
      ),
      child: Column(
        children: [
          // Drag Handle
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                  ),
                  child: const Icon(Icons.notifications_active_rounded, color: Color(0xFFFBBF24), size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "LIVE NOTIFICATIONS",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1,
                        ),
                      ),
                      Text(
                        "Real-time alerts from Admin & Atelier",
                        style: TextStyle(color: Colors.white54, fontSize: 11.5),
                      ),
                    ],
                  ),
                ),
                // Mark all as read
                ValueListenableBuilder<int>(
                  valueListenable: DynamicNotificationService.unreadCount,
                  builder: (_, count, __) {
                    if (count == 0) return const SizedBox.shrink();
                    return TextButton(
                      onPressed: () => DynamicNotificationService.markAllAsRead(),
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFFFBBF24),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      ),
                      child: const Text(
                        "Read All",
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    );
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white60),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          const SizedBox(height: 10),
          const Divider(color: Color(0xFF1F1F26), height: 1),

          // Notifications List
          Expanded(
            child: ValueListenableBuilder<List<AppNotificationItem>>(
              valueListenable: DynamicNotificationService.notifications,
              builder: (context, notifs, _) {
                if (notifs.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(22),
                            decoration: BoxDecoration(
                              color: const Color(0xFF14141A),
                              shape: BoxShape.circle,
                              border: Border.all(color: const Color(0xFF27272A)),
                            ),
                            child: const Icon(
                              Icons.notifications_none_rounded,
                              size: 48,
                              color: Color(0xFFFBBF24),
                            ),
                          ),
                          const SizedBox(height: 18),
                          const Text(
                            "No Alerts Yet",
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            "Whenever Admin adds new products, updates orders, or drops new sales, live alerts will appear here instantly!",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white54,
                              fontSize: 13,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                  itemCount: notifs.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final item = notifs[index];
                    final color = _getColor(item.type);

                    return Dismissible(
                      key: Key(item.id),
                      direction: DismissDirection.endToStart,
                      background: Container(
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 20),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDC2626),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(Icons.delete_outline, color: Colors.white),
                      ),
                      onDismissed: (_) {
                        DynamicNotificationService.removeNotification(item.id);
                      },
                      child: GestureDetector(
                        onTap: () {
                          DynamicNotificationService.markAsRead(item.id);
                          Navigator.pop(context);
                          DynamicNotificationService.handleNotificationNavigation(item);
                        },
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: item.isRead
                                ? const Color(0xFF111116)
                                : const Color(0xFF191922),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: item.isRead
                                  ? const Color(0xFF27272A)
                                  : color.withValues(alpha: 0.5),
                              width: item.isRead ? 1 : 1.5,
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Icon
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: 0.15),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: color.withValues(alpha: 0.3),
                                  ),
                                ),
                                child: Icon(
                                  _getIcon(item.type),
                                  color: color,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),

                              // Content
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            item.title,
                                            style: TextStyle(
                                              color: color,
                                              fontSize: 12.5,
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: 0.5,
                                            ),
                                          ),
                                        ),
                                        if (!item.isRead) ...[
                                          Container(
                                            width: 7,
                                            height: 7,
                                            decoration: const BoxDecoration(
                                              color: Color(0xFFFBBF24),
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                        ],
                                        Text(
                                          _formatTime(item.timestamp),
                                          style: const TextStyle(
                                            color: Colors.white38,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 5),
                                    Text(
                                      item.message,
                                      style: TextStyle(
                                        color: item.isRead
                                            ? Colors.white70
                                            : Colors.white,
                                        fontSize: 13.5,
                                        fontWeight: item.isRead
                                            ? FontWeight.normal
                                            : FontWeight.w600,
                                        height: 1.3,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),

          // Bottom Bar Actions
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.cleaning_services_rounded, size: 16),
                    label: const Text("Clear All"),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white60,
                      side: const BorderSide(color: Color(0xFF27272A)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: () => DynamicNotificationService.clearAll(),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.flash_on_rounded, size: 16),
                    label: const Text("Test Alert"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF59E0B),
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: () {
                      DynamicNotificationService.addNotification(
                        AppNotificationItem(
                          id: 'test_${DateTime.now().millisecondsSinceEpoch}',
                          title: '✨ ADMIN LIVE SYNC ACTIVE',
                          message:
                              'Whenever you add/edit products or change orders in Firebase Admin, live drop-down alerts will appear on every screen!',
                          type: NotificationType.adminBroadcast,
                          timestamp: DateTime.now(),
                        ),
                        showTopBanner: true,
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
