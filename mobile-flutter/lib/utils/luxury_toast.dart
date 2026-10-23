import 'package:flutter/material.dart';

class LuxuryToast {
  static void showSuccess(BuildContext context, String message, {String? title}) {
    _show(
      context: context,
      message: message,
      title: title ?? "Success",
      icon: Icons.check_circle_rounded,
      iconColor: const Color(0xFF34D399),
      borderColor: const Color(0xFF10B981).withOpacity(0.6),
      gradientColors: const [Color(0xFF11261B), Color(0xFF08140E)],
      accentGlow: const Color(0xFF10B981),
    );
  }

  static void showError(BuildContext context, String message, {String? title}) {
    _show(
      context: context,
      message: message,
      title: title ?? "Notice",
      icon: Icons.error_outline_rounded,
      iconColor: const Color(0xFFF87171),
      borderColor: const Color(0xFFEF4444).withOpacity(0.6),
      gradientColors: const [Color(0xFF261012), Color(0xFF140809)],
      accentGlow: const Color(0xFFEF4444),
    );
  }

  static void showInfo(BuildContext context, String message, {String? title, IconData? icon}) {
    _show(
      context: context,
      message: message,
      title: title ?? "Vraj Creation",
      icon: icon ?? Icons.auto_awesome,
      iconColor: const Color(0xFFFBBF24),
      borderColor: const Color(0xFFF59E0B).withOpacity(0.6),
      gradientColors: const [Color(0xFF221606), Color(0xFF100B03)],
      accentGlow: const Color(0xFFF59E0B),
    );
  }

  static void _show({
    required BuildContext context,
    required String message,
    required String title,
    required IconData icon,
    required Color iconColor,
    required Color borderColor,
    required List<Color> gradientColors,
    required Color accentGlow,
    Duration duration = const Duration(milliseconds: 3200),
  }) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.transparent,
        elevation: 0,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 20),
        padding: EdgeInsets.zero,
        duration: duration,
        content: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: gradientColors,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: borderColor, width: 1.2),
            boxShadow: [
              BoxShadow(
                color: accentGlow.withOpacity(0.25),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
              BoxShadow(
                color: Colors.black.withOpacity(0.7),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: iconColor.withOpacity(0.3)),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: iconColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      message,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
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
  }
}
