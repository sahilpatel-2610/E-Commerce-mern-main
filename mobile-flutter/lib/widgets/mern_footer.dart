import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../utils/luxury_toast.dart';

class MernFooter extends StatelessWidget {
  final Function(int)? onNavigateTab;
  final VoidCallback? onScrollToTop;

  const MernFooter({
    super.key,
    this.onNavigateTab,
    this.onScrollToTop,
  });

  Future<void> _launchExternalUrl(BuildContext context, String url) async {
    try {
      final uri = Uri.parse(url);
      await launchUrl(uri);
    } catch (_) {
      try {
        await Clipboard.setData(ClipboardData(text: url));
        if (context.mounted) {
          LuxuryToast.showSuccess(
            context,
            "Link copied to clipboard: $url",
            title: "LINK READY",
          );
        }
      } catch (_) {}
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(0xFF070709),
      margin: const EdgeInsets.only(top: 20),
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // 1. Sleek Standalone Icon-Only Social Buttons (Instagram & Facebook)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Instagram Icon Button
              _buildIconOnlyButton(
                onTap: () => _launchExternalUrl(context, "https://www.instagram.com"),
                child: const CustomPaint(
                  size: Size(22, 22),
                  painter: _InstagramGlyphPainter(color: Color(0xFFFBBF24)),
                ),
              ),
              const SizedBox(width: 14),

              // Facebook Icon Button
              _buildIconOnlyButton(
                onTap: () => _launchExternalUrl(context, "https://www.facebook.com"),
                child: const CustomPaint(
                  size: Size(20, 20),
                  painter: _FacebookGlyphPainter(color: Color(0xFFFBBF24)),
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),
          const Divider(color: Color(0xFF1E2430), height: 1),
          const SizedBox(height: 14),

          // 2. Copyright Bar
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                "Copyright 2025 © ",
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              ),
              Text(
                "Vraj Creation",
                style: TextStyle(
                  color: Color(0xFFFBBF24),
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                ". All Rights Reserved.",
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Clean, Standalone Icon-Only Luxury Squircle Button
  Widget _buildIconOnlyButton({
    required Widget child,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(15),
        splashColor: const Color(0xFFF59E0B).withValues(alpha: 0.25),
        highlightColor: Colors.white.withValues(alpha: 0.05),
        child: Ink(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF161C2A), Color(0xFF0B0E17)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(15),
            border: Border.all(
              color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.65),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Center(child: child),
        ),
      ),
    );
  }
}

/// Precise Vector Painter for the Instagram Camera Logo
class _InstagramGlyphPainter extends CustomPainter {
  final Color color;
  const _InstagramGlyphPainter({this.color = const Color(0xFFFBBF24)});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final strokePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.9;

    final fillPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    // 1. Outer rounded camera body
    final outerRRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, w, h),
      Radius.circular(w * 0.28),
    );
    canvas.drawRRect(outerRRect, strokePaint);

    // 2. Center lens circle
    final center = Offset(w / 2, h / 2);
    canvas.drawCircle(center, w * 0.24, strokePaint);

    // 3. Top-right camera flash dot
    final dotCenter = Offset(w * 0.74, h * 0.26);
    canvas.drawCircle(dotCenter, w * 0.055, fillPaint);
  }

  @override
  bool shouldRepaint(covariant _InstagramGlyphPainter oldDelegate) =>
      oldDelegate.color != color;
}

/// Precise Vector Painter for the Facebook 'f' Logo
class _FacebookGlyphPainter extends CustomPainter {
  final Color color;
  const _FacebookGlyphPainter({this.color = const Color(0xFFFBBF24)});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final w = size.width;
    final h = size.height;

    final path = Path();
    path.moveTo(w * 0.70, h * 0.35);
    path.lineTo(w * 0.56, h * 0.35);
    path.lineTo(w * 0.56, h * 0.26);
    path.cubicTo(w * 0.56, h * 0.16, w * 0.60, h * 0.10, w * 0.74, h * 0.10);
    path.lineTo(w * 0.85, h * 0.10);
    path.lineTo(w * 0.85, 0.0);
    path.lineTo(w * 0.65, 0.0);
    path.cubicTo(w * 0.40, 0.0, w * 0.36, h * 0.16, w * 0.36, h * 0.26);
    path.lineTo(w * 0.36, h * 0.35);
    path.lineTo(w * 0.18, h * 0.35);
    path.lineTo(w * 0.18, h * 0.52);
    path.lineTo(w * 0.36, h * 0.52);
    path.lineTo(w * 0.36, h);
    path.lineTo(w * 0.56, h);
    path.lineTo(w * 0.56, h * 0.52);
    path.lineTo(w * 0.74, h * 0.52);
    path.close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _FacebookGlyphPainter oldDelegate) =>
      oldDelegate.color != color;
}
