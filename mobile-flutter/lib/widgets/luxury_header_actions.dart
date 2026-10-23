import 'package:flutter/material.dart';
import '../services/cart_service.dart';
import '../services/dynamic_notification_service.dart';
import '../screens/cart_screen.dart';
import 'search_modal.dart';
import 'account_menu_modal.dart';
import 'notification_center_modal.dart';

class LuxuryHeaderActions extends StatelessWidget {
  final Function(String query)? onNavigateToCollection;
  const LuxuryHeaderActions({super.key, this.onNavigateToCollection});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF0F0F14),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF27272A),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.6),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 1. Search Action Button
          _buildActionButton(
            context: context,
            icon: Icons.search_rounded,
            tooltip: "Search Products",
            onTap: () {
              SearchModal.show(
                context,
                onNavigateToCollection: onNavigateToCollection,
              );
            },
          ),

          const SizedBox(width: 6),

          // 2. Live Notification Bell with Badge
          ValueListenableBuilder<int>(
            valueListenable: DynamicNotificationService.unreadCount,
            builder: (context, count, _) {
              return _buildActionButton(
                context: context,
                icon: count > 0
                    ? Icons.notifications_active_rounded
                    : Icons.notifications_none_rounded,
                badgeCount: count,
                badgeColor: const Color(0xFFEF4444),
                tooltip: "Notifications",
                onTap: () => NotificationCenterModal.show(context),
              );
            },
          ),

          const SizedBox(width: 6),

          // 3. Profile / Account Action Button
          _buildActionButton(
            context: context,
            icon: Icons.person_outline_rounded,
            tooltip: "My Account",
            onTap: () => AccountMenuModal.show(context),
          ),

          const SizedBox(width: 6),

          // 4. Cart Action Button with Live Counter Badge
          AnimatedBuilder(
            animation: CartService(),
            builder: (context, _) {
              final count = CartService().itemCount;
              return _buildActionButton(
                context: context,
                icon: Icons.shopping_bag_outlined,
                badgeCount: count,
                badgeColor: const Color(0xFFF59E0B),
                isBadgeGold: true,
                tooltip: "Shopping Cart",
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const CartScreen()),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required BuildContext context,
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
    int badgeCount = 0,
    Color badgeColor = const Color(0xFFEF4444),
    bool isBadgeGold = false,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        splashColor: const Color(0xFFF59E0B).withValues(alpha: 0.25),
        highlightColor: const Color(0xFFF59E0B).withValues(alpha: 0.12),
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: const Color(0xFF181820),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: badgeCount > 0 && isBadgeGold
                  ? const Color(0xFFF59E0B).withValues(alpha: 0.6)
                  : const Color(0xFF2A2A34),
              width: 1.2,
            ),
          ),
          child: Stack(
            alignment: Alignment.center,
            clipBehavior: Clip.none,
            children: [
              Icon(
                icon,
                color: const Color(0xFFFBBF24),
                size: 20,
              ),
              if (badgeCount > 0)
                Positioned(
                  right: -3,
                  top: -3,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    decoration: BoxDecoration(
                      color: isBadgeGold ? const Color(0xFFF59E0B) : badgeColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: (isBadgeGold ? const Color(0xFFF59E0B) : badgeColor)
                              .withValues(alpha: 0.6),
                          blurRadius: 5,
                        ),
                      ],
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 16,
                      minHeight: 16,
                    ),
                    child: Text(
                      badgeCount > 9 ? '9+' : '$badgeCount',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: isBadgeGold ? Colors.black : Colors.white,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w900,
                      ),
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
