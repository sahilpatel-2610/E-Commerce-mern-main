import 'package:flutter/material.dart';

class PolicyItem {
  final IconData icon;
  final String title;
  final String desc;
  final List<Color> gradientColors;
  final Color iconColor;
  final Color borderColor;
  final String fullDetail;

  const PolicyItem({
    required this.icon,
    required this.title,
    required this.desc,
    required this.gradientColors,
    required this.iconColor,
    required this.borderColor,
    required this.fullDetail,
  });
}

class OurPolicyGrid extends StatelessWidget {
  const OurPolicyGrid({super.key});

  static const List<PolicyItem> defaultPolicies = [
    PolicyItem(
      icon: Icons.currency_exchange_rounded,
      title: "Easy Exchange Policy",
      desc: "Hassle-free size and product exchange on all orders.",
      gradientColors: [Color(0x33F59E0B), Color(0x1AD97706)],
      iconColor: Color(0xFFFBBF24),
      borderColor: Color(0x55F59E0B),
      fullDetail:
          "Need a different size or style? Enjoy our quick, hassle-free exchange process for all unworn garments with tags attached within 7 days of delivery.",
    ),
    PolicyItem(
      icon: Icons.event_available_rounded,
      title: "7 Days Return Policy",
      desc: "Easy 7-day return guarantee on eligible fashion apparel.",
      gradientColors: [Color(0x3310B981), Color(0x1A059669)],
      iconColor: Color(0xFF34D399),
      borderColor: Color(0x5510B981),
      fullDetail:
          "Shop with 100% confidence. Return any eligible item within 7 days of delivery in its original condition for a seamless refund or store credit.",
    ),
    PolicyItem(
      icon: Icons.headset_mic_rounded,
      title: "24/7 Dedicated Support",
      desc: "Expert customer assistance & sizing help whenever you need.",
      gradientColors: [Color(0x330EA5E9), Color(0x1A0284C7)],
      iconColor: Color(0xFF38BDF8),
      borderColor: Color(0x550EA5E9),
      fullDetail:
          "Our styling and customer care team is available round-the-clock via WhatsApp and In-App support to assist with measurements, tracking, and inquiries.",
    ),
    PolicyItem(
      icon: Icons.shield_rounded,
      title: "100% Secure Checkout",
      desc: "Safe & encrypted payments with UPI, Cards & Cash on Delivery.",
      gradientColors: [Color(0x33A855F7), Color(0x1A7E22CE)],
      iconColor: Color(0xFFC084FC),
      borderColor: Color(0x55A855F7),
      fullDetail:
          "Your transactions are safeguarded with bank-grade 256-bit SSL encryption. We accept all major UPI apps, Debit/Credit Cards, Net Banking, and COD.",
    ),
  ];

  void _showPolicyModal(BuildContext context, PolicyItem policy) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF090D16),
      barrierColor: Colors.black87,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 26),
          decoration: BoxDecoration(
            color: const Color(0xFF090D16),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: policy.gradientColors,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: policy.borderColor, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: policy.iconColor.withValues(alpha: 0.2),
                      blurRadius: 16,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Icon(policy.icon, color: policy.iconColor, size: 30),
              ),
              const SizedBox(height: 16),
              Text(
                policy.title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.3,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                policy.fullDetail,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 13.5,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text(
                    "Got It, Thank You",
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 13.5,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Sub-header
          Padding(
            padding: const EdgeInsets.only(left: 2, bottom: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.verified_outlined, color: Color(0xFFFBBF24), size: 12),
                      SizedBox(width: 5),
                      Text(
                        "OUR PROMISE & ASSURANCE",
                        style: TextStyle(
                          color: Color(0xFFFBBF24),
                          fontSize: 10.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.1,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Row 1: Cards 0 & 1 (IntrinsicHeight prevents any bottom overflow)
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(child: _buildPolicyCard(context, defaultPolicies[0])),
                const SizedBox(width: 12),
                Expanded(child: _buildPolicyCard(context, defaultPolicies[1])),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Row 2: Cards 2 & 3 (IntrinsicHeight prevents any bottom overflow)
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(child: _buildPolicyCard(context, defaultPolicies[2])),
                const SizedBox(width: 12),
                Expanded(child: _buildPolicyCard(context, defaultPolicies[3])),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPolicyCard(BuildContext context, PolicyItem policy) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _showPolicyModal(context, policy),
        borderRadius: BorderRadius.circular(22),
        splashColor: policy.iconColor.withValues(alpha: 0.15),
        highlightColor: Colors.white.withValues(alpha: 0.04),
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF111724), Color(0xFF090D16)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: const Color(0xFF1E293B),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.4),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Glowing Icon Badge matching Web Storefront
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: policy.gradientColors,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: policy.borderColor,
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: policy.iconColor.withValues(alpha: 0.18),
                      blurRadius: 10,
                      spreadRadius: 1,
                    ),
                  ],
                ),
                child: Icon(
                  policy.icon,
                  color: policy.iconColor,
                  size: 24,
                ),
              ),
              const SizedBox(height: 12),

              // Title
              Text(
                policy.title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.15,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 6),

              // Subtitle
              Text(
                policy.desc,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 11,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 8),

              // Subtle "Details" cue
              Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "Details",
                    style: TextStyle(
                      color: policy.iconColor.withValues(alpha: 0.85),
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(width: 3),
                  Icon(
                    Icons.arrow_forward_ios_rounded,
                    size: 8.5,
                    color: policy.iconColor.withValues(alpha: 0.85),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
