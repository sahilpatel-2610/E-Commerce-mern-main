import 'dart:async';
import 'package:flutter/material.dart';
import '../models/product_model.dart';
import '../models/banner_model.dart';
import '../services/firebase_service.dart';
import '../utils/luxury_toast.dart';
import '../widgets/brand_logo.dart';
import '../widgets/product_card.dart';
import '../widgets/hero_video_banner.dart';
import '../widgets/luxury_header_actions.dart';
import '../widgets/luxury_loader.dart';
import '../widgets/mern_footer.dart';
import '../widgets/our_policy_grid.dart';
import 'collection_screen.dart';

class HomeScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;
  const HomeScreen({super.key, this.onNavigateTab});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<HomeBanner> _banners = [];
  List<Product> _latestProducts = [];
  List<Product> _bestSellers = [];
  bool _loading = true;
  int _bannerIndex = 0;
  final TextEditingController _newsletterController = TextEditingController();
  bool _subscribing = false;
  bool _subscribed = false;
  late final PageController _pageController;
  late final ScrollController _scrollController;
  Timer? _imageTimer;

  Timer? _liveSyncTimer;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _scrollController = ScrollController();
    _loadHomeData();

    // Live sync catalog with Firebase every 60 seconds so Admin changes appear without exceeding quota
    _liveSyncTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      if (mounted) _loadHomeData(silent: true);
    });
  }

  @override
  void dispose() {
    _liveSyncTimer?.cancel();
    _imageTimer?.cancel();
    _pageController.dispose();
    _scrollController.dispose();
    _newsletterController.dispose();
    super.dispose();
  }

  Future<void> _loadHomeData({bool silent = false}) async {
    final banners = await FirebaseService.getBanners();
    final prods = await FirebaseService.getProducts();

    List<Product> latest = List<Product>.from(prods);
    List<Product> best = prods.where((p) => p.bestseller || p.isFeatured).toList();
    if (best.isEmpty) best = List<Product>.from(prods);

    if (mounted) {
      setState(() {
        _banners = banners;
        _latestProducts = latest;
        _bestSellers = best;
        if (!silent) _loading = false;
      });
      _resetImageTimerIfNeeded();
    }
  }

  void _onSlideChanged(int index) {
    setState(() => _bannerIndex = index);
    _resetImageTimerIfNeeded();
  }

  void _resetImageTimerIfNeeded() {
    _imageTimer?.cancel();
    if (_banners.length <= 1) return;
    final current = _banners[_bannerIndex];
    final isVid = current.mediaType == 'video' ||
        current.mediaUrl.endsWith('.mp4') ||
        current.mediaUrl.endsWith('.webm') ||
        current.mediaUrl.contains('/video/upload/');

    // Images auto-scroll after 4.5 seconds.
    // Videos play 100% of their full duration and auto-scroll upon video completion!
    if (!isVid) {
      _imageTimer = Timer(const Duration(milliseconds: 4500), () {
        _nextSlide();
      });
    }
  }

  void _nextSlide() {
    if (_banners.isEmpty || !_pageController.hasClients) return;
    final next = (_bannerIndex + 1) % _banners.length;
    _pageController.animateToPage(
      next,
      duration: const Duration(milliseconds: 650),
      curve: Curves.easeInOutCubic,
    );
  }

  Future<void> _handleSubscribe() async {
    final email = _newsletterController.text.trim();
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
        _newsletterController.clear();
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

  Widget _buildSectionTitle(String text1, String text2, {String? subtitle}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                "$text1 ",
                style: const TextStyle(
                  color: Color(0xFFF59E0B),
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                ),
              ),
              Text(
                text2,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(width: 8),
              Container(height: 2, width: 30, color: const Color(0xFFF59E0B)),
            ],
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFF9CA3AF),
                fontSize: 12,
                height: 1.4,
              ),
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Color(0xFF050505),
        body: Center(
          child: GoldenSweepLoader(size: 50),
        ),
      );
    }

    final screenWidth = MediaQuery.of(context).size.width;
    final cardWidth = (screenWidth - 32 - 12) / 2;
    final cardHeight = cardWidth / 0.62;
    final bestSellerHeight = cardHeight + 4;

    return Scaffold(
      backgroundColor: const Color(0xFF050505),
      appBar: AppBar(
        backgroundColor: const Color(0xFF09090D),
        elevation: 0,
        scrolledUnderElevation: 0,
        toolbarHeight: 64,
        titleSpacing: 14,
        title: const BrandLogo(height: 56),
        actions: [
          LuxuryHeaderActions(
            onNavigateToCollection: (query) {
              if (query.isNotEmpty) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => CollectionScreen(initialSearch: query),
                  ),
                );
              } else {
                widget.onNavigateTab?.call(1);
              }
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        color: const Color(0xFFF59E0B),
        backgroundColor: const Color(0xFF18181B),
        onRefresh: _loadHomeData,
        child: SingleChildScrollView(
          controller: _scrollController,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ================= 1. HERO SHOWCASE =================
              if (_banners.isNotEmpty) ...[
                Container(
                  height: 340,
                  margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFF27272A).withOpacity(0.8)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.7),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: Stack(
                      children: [
                        PageView.builder(
                          controller: _pageController,
                          itemCount: _banners.length,
                          onPageChanged: _onSlideChanged,
                          itemBuilder: (context, index) {
                            final b = _banners[index];
                            return Stack(
                              fit: StackFit.expand,
                              children: [
                                HeroBannerMedia(
                                  banner: b,
                                  isCurrent: _bannerIndex == index,
                                  onVideoComplete: _nextSlide,
                                ),
                                Container(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [
                                        Colors.black.withOpacity(0.85),
                                        Colors.black.withOpacity(0.2),
                                        Colors.transparent,
                                      ],
                                      begin: Alignment.bottomLeft,
                                      end: Alignment.topRight,
                                    ),
                                  ),
                                ),

                                // Text Content
                                Positioned(
                                  left: 20,
                                  right: 20,
                                  bottom: 24,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      // Sale / Tag
                                      if (b.subtitle.isNotEmpty)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFF59E0B),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            b.subtitle.toUpperCase(),
                                            style: const TextStyle(
                                              color: Colors.black,
                                              fontSize: 10.5,
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: 1,
                                            ),
                                          ),
                                        ),
                                      const SizedBox(height: 8),

                                      // Big Titles
                                      Text(
                                        b.title1,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 26,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 0.5,
                                          height: 1.1,
                                        ),
                                      ),
                                      Text(
                                        b.title2,
                                        style: const TextStyle(
                                          color: Color(0xFFFBBF24),
                                          fontSize: 28,
                                          fontWeight: FontWeight.w900,
                                          height: 1.1,
                                        ),
                                      ),
                                      const SizedBox(height: 14),

                                      // Shop Now CTA
                                      ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: const Color(0xFFF59E0B),
                                          foregroundColor: Colors.black,
                                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                                          elevation: 4,
                                        ),
                                        onPressed: () => widget.onNavigateTab?.call(1),
                                        child: const Text(
                                          "SHOP NOW →",
                                          style: TextStyle(
                                            fontWeight: FontWeight.w900,
                                            fontSize: 12,
                                            letterSpacing: 1.2,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            );
                          },
                        ),

                        // Slide Indicator Dots
                        if (_banners.length > 1)
                          Positioned(
                            bottom: 12,
                            right: 20,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.6),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white10),
                              ),
                              child: Row(
                                children: List.generate(_banners.length, (i) {
                                  return Container(
                                    margin: const EdgeInsets.symmetric(horizontal: 2),
                                    width: _bannerIndex == i ? 18 : 6,
                                    height: 5,
                                    decoration: BoxDecoration(
                                      color: _bannerIndex == i ? const Color(0xFFFBBF24) : Colors.white30,
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
              ],

              const SizedBox(height: 10),

              // ================= 2. LATEST COLLECTION (2 Independent Horizontal Rows) =================
              _buildSectionTitle(
                "LATEST",
                "COLLECTION",
                subtitle: "Discover our latest fashion collection featuring premium fabrics, trending styles, and elegant designs for every occasion.",
              ),

              if (_latestProducts.isNotEmpty) ...[
                // Line 1 (Independent Horizontal Scroll)
                SizedBox(
                  height: bestSellerHeight,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
                    physics: const BouncingScrollPhysics(),
                    itemCount: (_latestProducts.length + 1) ~/ 2,
                    itemBuilder: (context, index) {
                      final pIndex = index * 2;
                      if (pIndex >= _latestProducts.length) return const SizedBox.shrink();
                      final isLast = (pIndex + 2) >= _latestProducts.length;
                      return Container(
                        width: cardWidth,
                        margin: EdgeInsets.only(right: isLast ? 0 : 12),
                        child: ProductCard(product: _latestProducts[pIndex]),
                      );
                    },
                  ),
                ),

                // Line 2 (Independent Horizontal Scroll)
                if (_latestProducts.length > 1) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    height: bestSellerHeight,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
                      physics: const BouncingScrollPhysics(),
                      itemCount: _latestProducts.length ~/ 2,
                      itemBuilder: (context, index) {
                        final pIndex = (index * 2) + 1;
                        if (pIndex >= _latestProducts.length) return const SizedBox.shrink();
                        final isLast = (pIndex + 2) >= _latestProducts.length;
                        return Container(
                          width: cardWidth,
                          margin: EdgeInsets.only(right: isLast ? 0 : 12),
                          child: ProductCard(product: _latestProducts[pIndex]),
                        );
                      },
                    ),
                  ),
                ],
              ],

              const SizedBox(height: 20),

              // ================= 3. BEST SELLER SECTION (1 Row Horizontal Scroll - Exactly 2 Products Across Screen) =================
              _buildSectionTitle(
                "BEST",
                "SELLER",
                subtitle: "Explore our top-selling fashion picks, curated for unmatched quality, style, and everyday comfort.",
              ),

              if (_bestSellers.isNotEmpty)
                SizedBox(
                  height: bestSellerHeight,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
                    physics: const BouncingScrollPhysics(),
                    itemCount: _bestSellers.length,
                    itemBuilder: (context, index) {
                      return Container(
                        width: cardWidth,
                        margin: EdgeInsets.only(
                          right: index == _bestSellers.length - 1 ? 0 : 12,
                        ),
                        child: ProductCard(product: _bestSellers[index]),
                      );
                    },
                  ),
                ),

              const SizedBox(height: 20),

              // ================= 4. OUR POLICY SECTION (4 Standalone Luxury Cards) =================
              const OurPolicyGrid(),

              const SizedBox(height: 16),

              // ================= 5. VRAJ CREATION BUSINESS SHOWCASE =================
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF181822), Color(0xFF0E0E14), Color(0xFF08080C)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFF27272A)),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.auto_awesome, color: Color(0xFFFBBF24), size: 14),
                          SizedBox(width: 6),
                          Text(
                            "APPAREL & CLOTHING",
                            style: TextStyle(
                              color: Color(0xFFFBBF24),
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      "👔 Premium Men's Apparel\nManufacturer & Wholesaler",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // 3 Business Badges
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0A0A0D),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF27272A)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.location_on, color: Color(0xFFEF4444), size: 18),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              "Surat, Gujarat | Shipping Pan-India 🇮🇳",
                              style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0A0A0D),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF27272A)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.inventory_2_outlined, color: Color(0xFFF59E0B), size: 18),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              "📦 B2B Only. 🚫 No Retail",
                              style: TextStyle(color: Color(0xFFFBBF24), fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0A0A0D),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF27272A)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.checkroom, color: Color(0xFF10B981), size: 18),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              "Shirts, T-Shirts, Denim & Trousers",
                              style: TextStyle(color: Color(0xFF34D399), fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF59E0B),
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 15),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                      ),
                      onPressed: () => widget.onNavigateTab?.call(1),
                      child: const Text(
                        "Explore Wholesale Collections →",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // ================= 6. VIP NEWSLETTER BOX =================
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF14141A), Color(0xFF09090C)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.auto_awesome, color: Color(0xFFFBBF24), size: 14),
                          SizedBox(width: 6),
                          Text(
                            "VRAJ CREATION EXCLUSIVE",
                            style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold, letterSpacing: 1.2),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      "Never Miss a Drop!",
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 22),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      "Subscribe to receive exclusive lookbook releases, seasonal couture updates, and member-only privileges directly in your inbox.",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13.5, height: 1.4),
                    ),
                    const SizedBox(height: 16),
                    if (_subscribed)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF10B981).withOpacity(0.4)),
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
                              controller: _newsletterController,
                              style: const TextStyle(color: Colors.white, fontSize: 13),
                              decoration: InputDecoration(
                                hintText: "Enter your email address",
                                hintStyle: const TextStyle(color: Colors.white38, fontSize: 12.5),
                                filled: true,
                                fillColor: const Color(0xFF09090B),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Color(0xFF27272A)),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Color(0xFF27272A)),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
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
                              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: _subscribing ? null : _handleSubscribe,
                            child: _subscribing
                                ? const GoldenSweepLoader(size: 16)
                                : const Text("Subscribe", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                          ),
                        ],
                      ),
                  ],
                ),
              ),

              // ================= 7. OFFICIAL MERN ATELIER FOOTER =================
              MernFooter(
                onNavigateTab: widget.onNavigateTab,
                onScrollToTop: () {
                  if (_scrollController.hasClients) {
                    _scrollController.animateTo(
                      0,
                      duration: const Duration(milliseconds: 600),
                      curve: Curves.easeInOutCubic,
                    );
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
