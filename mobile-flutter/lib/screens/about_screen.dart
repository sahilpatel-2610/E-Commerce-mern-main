import 'dart:async';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../services/firebase_service.dart';
import '../widgets/luxury_header_actions.dart';
import '../widgets/mern_footer.dart';
import '../widgets/luxury_loader.dart';
import '../utils/luxury_toast.dart';
import '../utils/image_optimizer.dart';

class AboutScreen extends StatefulWidget {
  const AboutScreen({super.key});

  @override
  State<AboutScreen> createState() => _AboutScreenState();
}

class _AboutScreenState extends State<AboutScreen> {
  List<Map<String, dynamic>> _slides = [];
  bool _loading = true;
  int _currentSlide = 0;
  late final PageController _pageController;
  Timer? _autoScrollTimer;
  final TextEditingController _emailController = TextEditingController();
  bool _subscribing = false;
  bool _subscribed = false;

  static const List<Map<String, dynamic>> defaultAboutSlides = [
    {
      'title': 'Surat Atelier Lookbook',
      'tag': 'LOOKBOOK 01',
      'caption': 'Bespoke Craftsmanship & Luxury Weaves',
      'src': 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=1080&auto=format&fit=crop&q=80',
    },
    {
      'title': 'Signature Tailoring',
      'tag': 'LOOKBOOK 02',
      'caption': 'Precision Cut & Modern Silhouette',
      'src': 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1080&auto=format&fit=crop&q=80',
    },
    {
      'title': 'Everyday Prestige',
      'tag': 'LOOKBOOK 03',
      'caption': 'Comfort, Breathability & Elegance',
      'src': 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1080&auto=format&fit=crop&q=80',
    },
  ];

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _fetchAboutData();
  }

  @override
  void dispose() {
    _autoScrollTimer?.cancel();
    _pageController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _fetchAboutData() async {
    try {
      final slides = await FirebaseService.getAboutSlides();
      if (mounted) {
        setState(() {
          _slides = slides.isNotEmpty ? slides : defaultAboutSlides;
          _loading = false;
        });
        _resetTimerIfNeeded();
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _slides = defaultAboutSlides;
          _loading = false;
        });
      }
    }
  }

  void _onSlideChanged(int index) {
    setState(() => _currentSlide = index);
    _resetTimerIfNeeded();
  }

  void _resetTimerIfNeeded() {
    _autoScrollTimer?.cancel();
    if (_slides.length <= 1) return;

    final slide = _slides[_currentSlide];
    final mediaSrc = (slide['src'] ?? slide['image'] ?? slide['imageUrl'] ?? slide['url'] ?? '').toString();
    final isVideo = mediaSrc.endsWith('.mp4') || mediaSrc.endsWith('.webm') || mediaSrc.contains('/video/upload/');

    if (!isVideo) {
      _autoScrollTimer = Timer(const Duration(milliseconds: 3500), _nextSlide);
    }
  }

  void _nextSlide() {
    if (_slides.isEmpty || !_pageController.hasClients) return;
    final next = (_currentSlide + 1) % _slides.length;
    _pageController.animateToPage(
      next,
      duration: const Duration(milliseconds: 650),
      curve: Curves.easeInOutCubic,
    );
  }

  Future<void> _handleSubscribe() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      LuxuryToast.showError(context, "Please enter a valid email address.", title: "VIP DROPS");
      return;
    }

    setState(() => _subscribing = true);
    final ok = await FirebaseService.addSubscriber(email);
    setState(() {
      _subscribing = false;
      if (ok) _subscribed = true;
    });

    if (mounted) {
      if (ok) {
        _emailController.clear();
        LuxuryToast.showSuccess(
          context,
          "Subscribed successfully to Vraj Creation VIP Drops!",
          title: "VIP SUBSCRIBED",
        );
      } else {
        LuxuryToast.showError(
          context,
          "Failed to subscribe. Please try again.",
          title: "SUBSCRIPTION NOTICE",
        );
      }
    }
  }

  Widget _buildSectionHeader({
    required String badge,
    required String titlePrefix,
    required String titleHighlight,
    String? subtitle,
  }) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.auto_awesome, color: Color(0xFFFBBF24), size: 12),
              const SizedBox(width: 5),
              Text(
                badge.toUpperCase(),
                style: const TextStyle(
                  color: Color(0xFFFBBF24),
                  fontSize: 10.5,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              "$titlePrefix ",
              style: const TextStyle(
                color: Color(0xFFF59E0B),
                fontSize: 22,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.1,
              ),
            ),
            Text(
              titleHighlight,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.1,
              ),
            ),
            const SizedBox(width: 8),
            Container(height: 2.5, width: 28, color: const Color(0xFFF59E0B)),
          ],
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 12,
              height: 1.4,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildHeritagePill({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF131A29), Color(0xFF090D16)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF1E293B)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: const Color(0xFFFBBF24), size: 22),
          const SizedBox(height: 6),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 12,
              letterSpacing: 0.2,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHighlightCard({
    required IconData icon,
    required String tag,
    required String title,
    required String desc,
    required String number,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF111726), Color(0xFF090D16)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF1E293B), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.4),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFFF59E0B).withValues(alpha: 0.25),
                      const Color(0xFFD97706).withValues(alpha: 0.08),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: Icon(icon, color: const Color(0xFFFBBF24), size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        tag.toUpperCase(),
                        style: const TextStyle(
                          color: Color(0xFFFBBF24),
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.1,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      desc,
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 11.5,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          Positioned(
            top: 0,
            right: 0,
            child: Text(
              number,
              style: TextStyle(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.35),
                fontSize: 14,
                fontWeight: FontWeight.w900,
                fontFamily: 'monospace',
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWhyChooseCard({
    required IconData icon,
    required Color iconColor,
    required List<Color> gradientColors,
    required Color borderColor,
    required String title,
    required String desc,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF111724), Color(0xFF090D16)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFF1E293B), width: 1.2),
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
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: gradientColors,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: borderColor, width: 1.2),
              boxShadow: [
                BoxShadow(
                  color: iconColor.withValues(alpha: 0.18),
                  blurRadius: 10,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(height: 12),
          Text(
            title,
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
          Text(
            desc,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 11,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF050505),
      appBar: AppBar(
        backgroundColor: const Color(0xFF09090D),
        elevation: 0,
        scrolledUnderElevation: 0,
        automaticallyImplyLeading: false,
        title: const Text(
          "ABOUT US",
          style: TextStyle(
            color: Color(0xFFFBBF24),
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFFFBBF24), size: 22),
            onPressed: () {
              setState(() => _loading = true);
              _fetchAboutData();
            },
            tooltip: "Refresh About Us",
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: _loading
          ? const Center(child: GoldenSweepLoader(size: 50))
          : RefreshIndicator(
              color: const Color(0xFFF59E0B),
              backgroundColor: const Color(0xFF18181B),
              onRefresh: _fetchAboutData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                child: Column(
                  children: [
                    // ================= 1. HEADER BRAND TITLE =================
                    _buildSectionHeader(
                      badge: "LUXURY MEN'S COUTURE",
                      titlePrefix: "ABOUT",
                      titleHighlight: "OUR BRAND",
                      subtitle:
                          "Crafting distinguished apparel for discerning style—premium fabrics, perfect fits, and timeless elegance by Vraj Creation.",
                    ),
                    const SizedBox(height: 20),

                    // ================= 2. LOOKBOOK SLIDER =================
                    if (_slides.isNotEmpty) ...[
                      Container(
                        height: 480,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(28),
                          border: Border.all(
                            color: const Color(0xFFF59E0B).withValues(alpha: 0.5),
                            width: 1.6,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            ),
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.8),
                              blurRadius: 18,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(26),
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              PageView.builder(
                                controller: _pageController,
                                itemCount: _slides.length,
                                onPageChanged: _onSlideChanged,
                                itemBuilder: (context, index) {
                                  final slide = _slides[index];
                                  final mediaSrc = (slide['src'] ?? slide['image'] ?? slide['imageUrl'] ?? slide['url'] ?? '').toString();
                                  final title = (slide['title'] ?? slide['name'] ?? 'Surat Atelier Lookbook').toString();
                                  final tag = (slide['tag'] ?? 'LOOKBOOK 0${index + 1}').toString();
                                  final caption = (slide['caption'] ?? slide['description'] ?? 'Bespoke Craftsmanship').toString();
                                  final isVideo = mediaSrc.endsWith('.mp4') || mediaSrc.endsWith('.webm') || mediaSrc.contains('/video/upload/');

                                  return Stack(
                                    fit: StackFit.expand,
                                    children: [
                                      if (isVideo)
                                        _AboutVideoPlayer(
                                          url: mediaSrc,
                                          isCurrent: _currentSlide == index,
                                          onVideoComplete: _nextSlide,
                                        )
                                      else if (mediaSrc.isNotEmpty)
                                        ImageOptimizer.cachedImage(
                                          imageUrl: mediaSrc,
                                          fit: BoxFit.cover,
                                          memCacheWidth: 1080,
                                          memCacheHeight: 1600,
                                        )
                                      else
                                        Container(color: const Color(0xFF141418)),

                                      // Luxury Gradient Overlay
                                      Container(
                                        decoration: BoxDecoration(
                                          gradient: LinearGradient(
                                            colors: [
                                              Colors.black.withValues(alpha: 0.92),
                                              Colors.black.withValues(alpha: 0.25),
                                              Colors.transparent,
                                              Colors.black.withValues(alpha: 0.35),
                                            ],
                                            stops: const [0.0, 0.4, 0.7, 1.0],
                                            begin: Alignment.bottomCenter,
                                            end: Alignment.topCenter,
                                          ),
                                        ),
                                      ),

                                      // Slide Info & Badges
                                      Positioned(
                                        bottom: 18,
                                        left: 18,
                                        right: 18,
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4.5),
                                              decoration: BoxDecoration(
                                                gradient: LinearGradient(
                                                  colors: [
                                                    const Color(0xFFF59E0B).withValues(alpha: 0.3),
                                                    const Color(0xFFD97706).withValues(alpha: 0.15),
                                                  ],
                                                ),
                                                borderRadius: BorderRadius.circular(20),
                                                border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.6)),
                                              ),
                                              child: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  const Icon(Icons.auto_awesome, color: Color(0xFFFBBF24), size: 12),
                                                  const SizedBox(width: 5),
                                                  Text(
                                                    tag.toUpperCase(),
                                                    style: const TextStyle(
                                                      color: Color(0xFFFBBF24),
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.w900,
                                                      letterSpacing: 1.2,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(height: 8),
                                            Text(
                                              title,
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontWeight: FontWeight.w900,
                                                fontSize: 20,
                                                letterSpacing: 0.4,
                                                shadows: [
                                                  Shadow(color: Colors.black, blurRadius: 8),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(height: 3),
                                            Text(
                                              caption,
                                              style: const TextStyle(
                                                color: Color(0xFFE5E7EB),
                                                fontSize: 12.5,
                                                height: 1.4,
                                                shadows: [
                                                  Shadow(color: Colors.black, blurRadius: 6),
                                                ],
                                              ),
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  );
                                },
                              ),

                              // Top-Right Indicator
                              Positioned(
                                top: 14,
                                right: 14,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.7),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                                  ),
                                  child: Row(
                                    children: List.generate(_slides.length, (i) {
                                      return Container(
                                        margin: const EdgeInsets.symmetric(horizontal: 2),
                                        width: _currentSlide == i ? 16 : 5,
                                        height: 4.5,
                                        decoration: BoxDecoration(
                                          color: _currentSlide == i ? const Color(0xFFFBBF24) : Colors.white38,
                                          borderRadius: BorderRadius.circular(3),
                                        ),
                                      );
                                    }),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    // ================= 3. 2x2 ATELIER HERITAGE KPI PILLS =================
                    IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Expanded(
                            child: _buildHeritagePill(
                              icon: Icons.location_city_rounded,
                              title: "Surat Atelier",
                              subtitle: "Textile Capital of India",
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildHeritagePill(
                              icon: Icons.precision_manufacturing_rounded,
                              title: "100% In-House",
                              subtitle: "Yarn to Signature Fit",
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Expanded(
                            child: _buildHeritagePill(
                              icon: Icons.architecture_rounded,
                              title: "Master Tailoring",
                              subtitle: "Bespoke Silhouette",
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildHeritagePill(
                              icon: Icons.local_shipping_rounded,
                              title: "Pan-India Shipping",
                              subtitle: "Doorstep Delivery 🇮🇳",
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),

                    // ================= 4. OUR SIGNATURE HIGHLIGHTS =================
                    _buildSectionHeader(
                      badge: "BESPOKE CRAFTSMANSHIP",
                      titlePrefix: "OUR LATEST",
                      titleHighlight: "HIGHLIGHTS",
                      subtitle:
                          "Discover bespoke men's apparel crafted with perfection — breathable fabrics, signature silhouettes, and timeless craftsmanship.",
                    ),
                    const SizedBox(height: 16),

                    _buildHighlightCard(
                      icon: Icons.checkroom_rounded,
                      tag: "Fine Fabrics",
                      title: "Artisanal Weaves & All-Day Comfort",
                      desc:
                          "Finest handpicked cottons and luxury blends offering breathable, all-day ease with an ultra-premium feel.",
                      number: "01",
                    ),
                    const SizedBox(height: 12),
                    _buildHighlightCard(
                      icon: Icons.architecture_rounded,
                      tag: "Master Tailoring",
                      title: "Precision Fit & Structured Silhouette",
                      desc:
                          "Master-cut patterns designed to deliver a sharp, tailored drape for both formal elegance and casual luxury.",
                      number: "02",
                    ),
                    const SizedBox(height: 12),
                    _buildHighlightCard(
                      icon: Icons.auto_awesome_rounded,
                      tag: "Signature Trends",
                      title: "Korean & Modern Urban Aesthetics",
                      desc:
                          "From trendsetting Korean ankle fits to statement coordinates, curated to elevate your everyday presence.",
                      number: "03",
                    ),
                    const SizedBox(height: 28),

                    // ================= 5. WHY CHOOSE US (2x2 IntrinsicHeight Grid) =================
                    _buildSectionHeader(
                      badge: "PREMIUM EXPERIENCE",
                      titlePrefix: "WHY",
                      titleHighlight: "CHOOSE US",
                      subtitle: "Dedicated to quality, authenticity, and unmatched customer delight.",
                    ),
                    const SizedBox(height: 16),

                    // Row 1
                    IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Expanded(
                            child: _buildWhyChooseCard(
                              icon: Icons.verified_user_rounded,
                              iconColor: const Color(0xFFFBBF24),
                              gradientColors: const [Color(0x33F59E0B), Color(0x1AD97706)],
                              borderColor: const Color(0x55F59E0B),
                              title: "Authentic Quality",
                              desc: "Rigorous quality checks for flawless stitching and luxury.",
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildWhyChooseCard(
                              icon: Icons.local_shipping_rounded,
                              iconColor: const Color(0xFF34D399),
                              gradientColors: const [Color(0x3310B981), Color(0x1A059669)],
                              borderColor: const Color(0x5510B981),
                              title: "Fast Delivery",
                              desc: "Carefully dispatched swiftly with secure end-to-end tracking.",
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Row 2
                    IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Expanded(
                            child: _buildWhyChooseCard(
                              icon: Icons.support_agent_rounded,
                              iconColor: const Color(0xFF38BDF8),
                              gradientColors: const [Color(0x330EA5E9), Color(0x1A0284C7)],
                              borderColor: const Color(0x550EA5E9),
                              title: "Fashion Support",
                              desc: "Styling and measurement guidance whenever you need.",
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildWhyChooseCard(
                              icon: Icons.currency_exchange_rounded,
                              iconColor: const Color(0xFFC084FC),
                              gradientColors: const [Color(0x33A855F7), Color(0x1A7E22CE)],
                              borderColor: const Color(0x55A855F7),
                              title: "Easy Exchange",
                              desc: "Hassle-free size and product exchange on all orders.",
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),

                    // ================= VIP NEWSLETTER DROP =================
                    Container(
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF131A29), Color(0xFF090D16)],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                        borderRadius: BorderRadius.circular(26),
                        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.35)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.5),
                            blurRadius: 14,
                            offset: const Offset(0, 5),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.06),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: Colors.white12),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.auto_awesome, color: Color(0xFFFBBF24), size: 12),
                                SizedBox(width: 6),
                                Text(
                                  "VRAJ CREATION EXCLUSIVE",
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            "Never Miss a Drop!",
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 22,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            "Subscribe to receive exclusive lookbook releases, seasonal couture updates, and member-only privileges directly in your inbox.",
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, height: 1.4),
                          ),
                          const SizedBox(height: 18),
                          if (_subscribed)
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                              ),
                              child: const Text(
                                "✓ Thank you for subscribing to Vraj Creation!",
                                style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            )
                          else
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _emailController,
                                    style: const TextStyle(color: Colors.white, fontSize: 13),
                                    decoration: InputDecoration(
                                      hintText: "Enter your email address",
                                      hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
                                      filled: true,
                                      fillColor: const Color(0xFF09090D),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(14),
                                        borderSide: const BorderSide(color: Color(0xFF27272A)),
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(14),
                                        borderSide: const BorderSide(color: Color(0xFF27272A)),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(14),
                                        borderSide: const BorderSide(color: Color(0xFFF59E0B)),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFFF59E0B),
                                    foregroundColor: Colors.black,
                                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    elevation: 0,
                                  ),
                                  onPressed: _subscribing ? null : _handleSubscribe,
                                  child: _subscribing
                                      ? const GoldenSweepLoader(size: 16)
                                      : const Text(
                                          "Subscribe",
                                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                                        ),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
    );
  }
}

class _AboutVideoPlayer extends StatefulWidget {
  final String url;
  final bool isCurrent;
  final VoidCallback? onVideoComplete;

  const _AboutVideoPlayer({
    required this.url,
    required this.isCurrent,
    this.onVideoComplete,
  });

  @override
  State<_AboutVideoPlayer> createState() => _AboutVideoPlayerState();
}

class _AboutVideoPlayerState extends State<_AboutVideoPlayer> {
  VideoPlayerController? _controller;
  bool _initialized = false;
  bool _hasError = false;
  bool _completedFired = false;
  Timer? _errorFallbackTimer;

  @override
  void initState() {
    super.initState();
    if (widget.isCurrent) {
      _initVideo();
    }
  }

  void _initVideo() {
    if (_controller != null) return;
    final media = widget.url.trim();
    if (media.isEmpty) return;

    VideoPlayerController ctrl;

    if (media.startsWith('http://') || media.startsWith('https://')) {
      final optUrl = ImageOptimizer.optimizeVideoUrl(media);
      final uri = Uri.tryParse(optUrl);
      if (uri == null) return;
      ctrl = VideoPlayerController.networkUrl(
        uri,
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
      );
    } else {
      String cleanPath = media;
      if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
      if (cleanPath == 'Fashion-SaiAagaman.mp4' || cleanPath == 'Vraj_Saiaagaman.mp4') {
        cleanPath = 'Fashion_saiaagaman.mp4';
      }
      if (!cleanPath.startsWith('assets/')) {
        cleanPath = "assets/videos/$cleanPath";
      }
      ctrl = VideoPlayerController.asset(
        cleanPath,
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
      );
    }

    _controller = ctrl
      ..setVolume(0.0)
      ..setLooping(false)
      ..addListener(_videoListener)
      ..initialize().then((_) {
        if (mounted && widget.isCurrent) {
          setState(() {
            _initialized = true;
            _hasError = false;
          });
          _controller?.play();
        }
      }).catchError((err) {
        if (mounted) {
          setState(() {
            _hasError = true;
          });
        }
        _errorFallbackTimer = Timer(const Duration(seconds: 4), () {
          widget.onVideoComplete?.call();
        });
      });
  }

  void _videoListener() {
    if (_controller != null && _initialized && widget.isCurrent) {
      final pos = _controller!.value.position;
      final dur = _controller!.value.duration;
      final isCompleted = _controller!.value.isCompleted;

      if (dur > Duration.zero && (isCompleted || pos >= dur - const Duration(milliseconds: 250))) {
        if (!_completedFired) {
          _completedFired = true;
          widget.onVideoComplete?.call();
        }
      }
    }
  }

  @override
  void didUpdateWidget(covariant _AboutVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.url != widget.url) {
      _disposeController();
      if (widget.isCurrent) {
        _initVideo();
      }
    } else if (oldWidget.isCurrent != widget.isCurrent) {
      if (widget.isCurrent) {
        _completedFired = false;
        _initVideo();
      } else {
        _disposeController();
      }
    }
  }

  void _disposeController() {
    _errorFallbackTimer?.cancel();
    _controller?.removeListener(_videoListener);
    _controller?.pause();
    _controller?.dispose();
    _controller = null;
    _initialized = false;
    _hasError = false;
    _completedFired = false;
  }

  @override
  void dispose() {
    _disposeController();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_initialized && _controller != null && !_hasError) {
      return SizedBox.expand(
        child: FittedBox(
          fit: BoxFit.cover,
          clipBehavior: Clip.hardEdge,
          child: SizedBox(
            width: _controller!.value.size.width > 0 ? _controller!.value.size.width : 16,
            height: _controller!.value.size.height > 0 ? _controller!.value.size.height : 9,
            child: VideoPlayer(_controller!),
          ),
        ),
      );
    }

    final poster = widget.url.replaceAll(
      RegExp(r'\.(mp4|webm|mov|avi|mkv)$', caseSensitive: false),
      '.jpg',
    );

    if (poster.isNotEmpty && (poster.startsWith('http://') || poster.startsWith('https://'))) {
      return ImageOptimizer.cachedImage(
        imageUrl: poster,
        fit: BoxFit.cover,
        memCacheWidth: 720,
        memCacheHeight: 1080,
      );
    }

    return Container(
      color: const Color(0xFF101014),
      child: const Center(
        child: GoldenSweepLoader(size: 38),
      ),
    );
  }
}
