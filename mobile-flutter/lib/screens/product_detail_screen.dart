import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product_model.dart';
import '../services/firebase_service.dart';
import '../services/cart_service.dart';
import '../utils/luxury_toast.dart';
import '../widgets/product_card.dart';
import '../utils/image_optimizer.dart';
import '../widgets/luxury_loader.dart';
import 'login_screen.dart';

class ProductDetailScreen extends StatefulWidget {
  final Product product;
  const ProductDetailScreen({super.key, required this.product});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _selectedImageIndex = 0;
  String? _selectedSize;
  String? _selectedColor;
  int _quantity = 1;
  String _activeTab = "description"; // "description", "reviews", "shipping"

  List<Product> _relatedProducts = [];
  List<Map<String, dynamic>> _reviews = [];
  bool _loadingReviews = true;

  // Review Form State
  bool _showReviewForm = false;
  double _newRating = 5.0;
  final TextEditingController _reviewerNameController = TextEditingController();
  final TextEditingController _reviewCommentController = TextEditingController();
  bool _submittingReview = false;

  @override
  void initState() {
    super.initState();
    if (widget.product.sizes.isNotEmpty) {
      _selectedSize = widget.product.sizes.first;
    }
    if (widget.product.colors.isNotEmpty) {
      _selectedColor = widget.product.colors.first;
    }
    _loadRelatedAndReviews();
  }

  @override
  void dispose() {
    _reviewerNameController.dispose();
    _reviewCommentController.dispose();
    super.dispose();
  }

  Future<void> _loadRelatedAndReviews() async {
    final all = await FirebaseService.getProducts();
    List<Product> related = all
        .where((p) => p.id != widget.product.id && p.category == widget.product.category)
        .toList();
    if (related.isEmpty) {
      related = all.where((p) => p.id != widget.product.id).toList();
    }
    final revs = await FirebaseService.getReviews(productId: widget.product.id);

    if (mounted) {
      setState(() {
        _relatedProducts = related;
        _reviews = revs;
        _loadingReviews = false;
      });
    }
  }

  double get _avgRating {
    if (_reviews.isEmpty) return widget.product.rating;
    final total = _reviews.fold<double>(
      0.0,
      (sum, r) => sum + ((r['rating'] as num?)?.toDouble() ?? 5.0),
    );
    return total / _reviews.length;
  }

  void _openImageZoom(int initialIndex) {
    final images = widget.product.images.isNotEmpty ? widget.product.images : [''];
    FullScreenImageZoomViewer.show(
      context,
      images: images,
      initialIndex: initialIndex,
      productName: widget.product.name,
    );
  }

  Future<void> _handleReviewSubmit() async {
    final sp = await SharedPreferences.getInstance();
    final isLoggedIn = sp.getBool('isLoggedIn') ?? false;

    if (!isLoggedIn) {
      if (mounted) {
        LuxuryToast.showError(
          context,
          "Please Sign In first to write a verified review!",
          title: "SIGN IN REQUIRED",
        );
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const LoginScreen()),
        );
      }
      return;
    }

    final comment = _reviewCommentController.text.trim();
    if (comment.isEmpty) {
      LuxuryToast.showError(
        context,
        "Please write your review feedback!",
        title: "FEEDBACK REQUIRED",
      );
      return;
    }

    final savedName = sp.getString('userName');
    final inputName = _reviewerNameController.text.trim();
    final authorName = (savedName != null && savedName.isNotEmpty)
        ? savedName
        : (inputName.isNotEmpty ? inputName : "Verified Patron");

    setState(() => _submittingReview = true);

    final ok = await FirebaseService.addReview({
      'productId': widget.product.id,
      'productName': widget.product.name,
      'userName': authorName,
      'name': authorName,
      'comment': comment,
      'review': comment,
      'rating': _newRating,
      'platform': 'Mobile Flutter',
      'source': 'Mobile Flutter',
      'date': DateTime.now().millisecondsSinceEpoch,
      'createdAt': DateTime.now().toIso8601String(),
    });

    setState(() => _submittingReview = false);

    if (ok) {
      _reviewCommentController.clear();
      _reviewerNameController.clear();
      setState(() => _showReviewForm = false);
      _loadRelatedAndReviews();
      if (mounted) {
        LuxuryToast.showSuccess(
          context,
          "✨ Your review has been saved to Firebase Firestore!",
          title: "REVIEW POSTED",
        );
      }
    } else {
      if (mounted) {
        LuxuryToast.showError(
          context,
          "Failed to submit review. Please check connection.",
          title: "ERROR",
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final images = p.images.isNotEmpty ? p.images : [''];
    final currentImage = images[_selectedImageIndex.clamp(0, images.length - 1)];

    final hasDiscount = p.oldPrice > p.price && p.oldPrice > 0;
    final discountPercent = hasDiscount
        ? (((p.oldPrice - p.price) / p.oldPrice) * 100).round()
        : 0;

    return Scaffold(
      backgroundColor: const Color(0xFF050505),
      appBar: AppBar(
        backgroundColor: const Color(0xFF09090B),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFFFBBF24), size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          "PRODUCT DETAILS",
          style: TextStyle(
            color: Color(0xFFFBBF24),
            fontSize: 15,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Breadcrumb Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: const Color(0xFF0A0A0E),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: const Text("Home", style: TextStyle(color: Colors.white54, fontSize: 11)),
                  ),
                  const Text("  /  ", style: TextStyle(color: Colors.white24, fontSize: 11)),
                  Text(p.category.toUpperCase(), style: const TextStyle(color: Colors.white54, fontSize: 11)),
                  const Text("  /  ", style: TextStyle(color: Colors.white24, fontSize: 11)),
                  Expanded(
                    child: Text(
                      p.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),

            // 2. Main Feature Image Gallery
            Container(
              height: 380,
              width: double.infinity,
              color: const Color(0xFF101014),
              child: Stack(
                children: [
                  GestureDetector(
                    onTap: () => _openImageZoom(_selectedImageIndex),
                    child: SizedBox.expand(
                      child: ImageOptimizer.cachedImage(
                        imageUrl: currentImage,
                        fit: BoxFit.cover,
                        memCacheWidth: 800,
                        memCacheHeight: 1200,
                      ),
                    ),
                  ),

                  // Bestseller / New Ribbon
                  if (p.bestseller || p.isFeatured)
                    Positioned(
                      top: 14,
                      left: 14,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFF59E0B), Color(0xFFFBBF24)],
                          ),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFF59E0B).withOpacity(0.5),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.star, color: Colors.black, size: 12),
                            const SizedBox(width: 4),
                            Text(
                              p.bestseller ? "BESTSELLER" : "FEATURED",
                              style: const TextStyle(
                                color: Colors.black,
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  // Zoom Icon Button
                  Positioned(
                    bottom: 14,
                    right: 14,
                    child: GestureDetector(
                      onTap: () => _openImageZoom(_selectedImageIndex),
                      child: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.8),
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.6)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.6),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: const Icon(Icons.zoom_in, color: Color(0xFFFBBF24), size: 20),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // 3. Thumbnails Strip Below Main Image
            if (images.length > 1)
              Container(
                height: 72,
                color: const Color(0xFF09090C),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: images.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 10),
                  itemBuilder: (context, index) {
                    final isCurrent = _selectedImageIndex == index;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedImageIndex = index),
                      child: Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isCurrent ? const Color(0xFFF59E0B) : const Color(0xFF27272A),
                            width: isCurrent ? 2 : 1,
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(9),
                          child: ImageOptimizer.cachedImage(
                            imageUrl: images[index],
                            fit: BoxFit.cover,
                            memCacheWidth: 150,
                            memCacheHeight: 150,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),

            // 4. Product Details Info Section
            Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category, SubCategory & Brand Chips
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                        ),
                        child: Text(
                          p.category.toUpperCase(),
                          style: const TextStyle(
                            color: Color(0xFFFBBF24),
                            fontSize: 11.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                      if (p.subCategory.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF18181D),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFF27272A)),
                          ),
                          child: Text(
                            p.subCategory.toUpperCase(),
                            style: const TextStyle(color: Colors.white70, fontSize: 11.5, fontWeight: FontWeight.bold),
                          ),
                        ),
                      if (p.brand.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF18181D),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFF27272A)),
                          ),
                          child: Text(
                            "Brand: ${p.brand}",
                            style: const TextStyle(color: Colors.white70, fontSize: 11.5, fontWeight: FontWeight.w600),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Product Title
                  Text(
                    p.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Ratings Summary
                  Row(
                    children: [
                      Row(
                        children: List.generate(5, (i) {
                          return Icon(
                            i < _avgRating.round() ? Icons.star : Icons.star_border,
                            color: const Color(0xFFF59E0B),
                            size: 15,
                          );
                        }),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _avgRating.toStringAsFixed(1),
                        style: const TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        "(${_reviews.length} ${_reviews.length == 1 ? 'review' : 'reviews'})",
                        style: const TextStyle(color: Colors.white38, fontSize: 12),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Pricing Row
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        "₹${p.price.toStringAsFixed(0)}",
                        style: const TextStyle(
                          color: Color(0xFFFBBF24),
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      if (hasDiscount) ...[
                        const SizedBox(width: 10),
                        Text(
                          "₹${p.oldPrice.toStringAsFixed(0)}",
                          style: const TextStyle(
                            color: Colors.white38,
                            fontSize: 16,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEF4444).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4)),
                          ),
                          child: Text(
                            "$discountPercent% OFF",
                            style: const TextStyle(
                              color: Color(0xFFF87171),
                              fontSize: 11.5,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),

                  const SizedBox(height: 14),

                  // Short Description
                  if (p.description.isNotEmpty) ...[
                    Text(
                      p.description,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 13,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 18),
                  ],

                  // Size Selector
                  if (p.sizes.isNotEmpty) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "SELECT SIZE",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                          ),
                        ),
                        Text(
                          "Selected: ${_selectedSize ?? 'None'}",
                          style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: p.sizes.map((s) {
                        final isSelected = _selectedSize == s;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedSize = s),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                            decoration: BoxDecoration(
                              gradient: isSelected
                                  ? const LinearGradient(
                                      colors: [Color(0xFFF59E0B), Color(0xFFFBBF24)],
                                    )
                                  : null,
                              color: isSelected ? null : const Color(0xFF141418),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected ? const Color(0xFFF59E0B) : const Color(0xFF27272A),
                              ),
                            ),
                            child: Text(
                              s,
                              style: TextStyle(
                                color: isSelected ? Colors.black : Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 18),
                  ],

                  // Color Selector
                  if (p.colors.isNotEmpty) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "COLOR",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                          ),
                        ),
                        Text(
                          "Selected: ${_selectedColor ?? 'None'}",
                          style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: p.colors.map((c) {
                        final isSelected = _selectedColor == c;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedColor = c),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFFF59E0B).withOpacity(0.2) : const Color(0xFF141418),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected ? const Color(0xFFF59E0B) : const Color(0xFF27272A),
                                width: isSelected ? 1.5 : 1,
                              ),
                            ),
                            child: Text(
                              c,
                              style: TextStyle(
                                color: isSelected ? const Color(0xFFFBBF24) : Colors.white70,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 18),
                  ],

                  // Quantity Selector & Add To Bag Button
                  Row(
                    children: [
                      // Quantity Pill
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF141418),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF27272A)),
                        ),
                        child: Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove, color: Colors.white70, size: 16),
                              onPressed: () {
                                if (_quantity > 1) setState(() => _quantity--);
                              },
                              constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                              padding: EdgeInsets.zero,
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 6),
                              child: Text(
                                "$_quantity",
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add, color: Colors.white70, size: 16),
                              onPressed: () => setState(() => _quantity++),
                              constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                              padding: EdgeInsets.zero,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Add to Cart Button
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFF59E0B),
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            elevation: 4,
                          ),
                          icon: const Icon(Icons.shopping_bag_outlined, color: Colors.black, size: 18),
                          label: const Text(
                            "ADD TO BAG",
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                              letterSpacing: 1.2,
                            ),
                          ),
                          onPressed: () {
                            if (p.sizes.isNotEmpty && _selectedSize == null) {
                              LuxuryToast.showError(
                                context,
                                "Please select a size first!",
                                title: "SELECT SIZE",
                              );
                              return;
                            }

                            for (int i = 0; i < _quantity; i++) {
                              CartService.instance.addToCart(
                                p,
                                size: _selectedSize ?? "Standard",
                                color: _selectedColor ?? "",
                              );
                            }

                            LuxuryToast.showSuccess(
                              context,
                              "${p.name} added to your Bag! 🛍️",
                              title: "SHOPPING BAG",
                            );
                          },
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // 3 Trust Perks
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0C0C10),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF222228)),
                    ),
                    child: Column(
                      children: const [
                        _TrustPerkRow(icon: Icons.verified, text: "100% Authentic & Quality Guaranteed"),
                        SizedBox(height: 8),
                        _TrustPerkRow(icon: Icons.local_shipping, text: "Cash on Delivery (COD) & Wholesale Orders"),
                        SizedBox(height: 8),
                        _TrustPerkRow(icon: Icons.sync, text: "Easy 7-Day Hassle-Free Returns & Exchanges"),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // 5. Tabs Section (Description, Reviews, Shipping)
                  Row(
                    children: [
                      _buildTabButton("description", "Specifications"),
                      _buildTabButton("reviews", "Reviews (${_reviews.length})"),
                      _buildTabButton("shipping", "Shipping Policy"),
                    ],
                  ),

                  const Divider(color: Color(0xFF27272A), height: 2),
                  const SizedBox(height: 14),

                  // Tab 1: Specifications Content
                  if (_activeTab == "description") ...[
                    if (p.description.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(
                          p.description,
                          style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.5),
                        ),
                      ),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF101015),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF27272A)),
                      ),
                      child: Column(
                        children: [
                          _buildSpecRow("Brand", p.brand.isNotEmpty ? p.brand : "Vraj Creation"),
                          _buildSpecRow("Category", p.category.toUpperCase()),
                          _buildSpecRow("Sub Category", p.subCategory.isNotEmpty ? p.subCategory : "Bespoke Menswear"),
                          if (p.sizes.isNotEmpty) _buildSpecRow("Available Sizes", p.sizes.join(", ")),
                          if (p.colors.isNotEmpty) _buildSpecRow("Available Colors", p.colors.join(", ")),
                          _buildSpecRow("Stock Status", "In Stock (Ready to Tailor & Dispatch)"),
                          _buildSpecRow("Origin", "Handcrafted in Surat Atelier, Gujarat", isLast: true),
                        ],
                      ),
                    ),
                  ],

                  // Tab 2: Reviews Content (Live Firebase Firestore Reviews)
                  if (_activeTab == "reviews") ...[
                    // Review Header & Write Review Button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "${_avgRating.toStringAsFixed(1)} ★ out of 5.0",
                              style: const TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.w900, fontSize: 15),
                            ),
                            Text(
                              "Based on ${_reviews.length} real patrons in Firebase",
                              style: const TextStyle(color: Colors.white38, fontSize: 11),
                            ),
                          ],
                        ),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1C1917),
                            foregroundColor: const Color(0xFFFBBF24),
                            side: const BorderSide(color: Color(0xFFF59E0B)),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          icon: Icon(_showReviewForm ? Icons.close : Icons.edit, size: 14),
                          label: Text(
                            _showReviewForm ? "Cancel" : "Write Review",
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                          ),
                          onPressed: () => setState(() => _showReviewForm = !_showReviewForm),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Review Form
                    if (_showReviewForm)
                      Container(
                        padding: const EdgeInsets.all(14),
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF101015),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.4)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "YOUR RATING",
                              style: TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.w900),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: List.generate(5, (index) {
                                return GestureDetector(
                                  onTap: () => setState(() => _newRating = (index + 1).toDouble()),
                                  child: Icon(
                                    index < _newRating ? Icons.star : Icons.star_border,
                                    color: const Color(0xFFF59E0B),
                                    size: 26,
                                  ),
                                );
                              }),
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: _reviewCommentController,
                              maxLines: 3,
                              style: const TextStyle(color: Colors.white, fontSize: 13),
                              decoration: InputDecoration(
                                hintText: "Write your verified product review...",
                                hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
                                filled: true,
                                fillColor: const Color(0xFF16161D),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: const BorderSide(color: Color(0xFF27272A)),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFF59E0B),
                                  foregroundColor: Colors.black,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                onPressed: _submittingReview ? null : _handleReviewSubmit,
                                child: _submittingReview
                                    ? const GoldenSweepLoader(size: 18)
                                    : const Text("SUBMIT REVIEW TO FIREBASE", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Reviews List
                    if (_loadingReviews)
                      const Center(child: GoldenSweepLoader(size: 40))
                    else if (_reviews.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF101015),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF27272A)),
                        ),
                        child: const Center(
                          child: Text(
                            "No reviews yet. Be the first patron to review this piece!",
                            style: TextStyle(color: Colors.white38, fontSize: 12),
                          ),
                        ),
                      )
                    else
                      Column(
                        children: _reviews.map((rev) {
                          final rName = (rev['userName'] ?? rev['name'] ?? 'Patron').toString();
                          final rComment = (rev['comment'] ?? rev['review'] ?? '').toString();
                          final rRating = (rev['rating'] as num?)?.toDouble() ?? 5.0;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF101015),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFF27272A)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      rName,
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                    Row(
                                      children: List.generate(5, (i) {
                                        return Icon(
                                          i < rRating ? Icons.star : Icons.star_border,
                                          color: const Color(0xFFF59E0B),
                                          size: 13,
                                        );
                                      }),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  rComment,
                                  style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.4),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                  ],

                  // Tab 3: Shipping Policy
                  if (_activeTab == "shipping")
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF101015),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF27272A)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text("📦 FREE PAN-INDIA EXPRESS SHIPPING", style: TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.w900, fontSize: 12)),
                          SizedBox(height: 4),
                          Text("All orders are tailored and dispatched directly from our Surat Atelier within 24-48 business hours with live tracking.", style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.4)),
                          SizedBox(height: 10),
                          Text("🔄 7-DAY HASSLE-FREE EXCHANGE", style: TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.w900, fontSize: 12)),
                          SizedBox(height: 4),
                          Text("If the fit is not 100% bespoke to your liking, we offer immediate size replacement or doorstep pickup guarantee.", style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.4)),
                        ],
                      ),
                    ),

                  const SizedBox(height: 28),

                  // 6. Related Products Grid
                  if (_relatedProducts.isNotEmpty) ...[
                    Row(
                      children: [
                        Container(
                          width: 3,
                          height: 16,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF59E0B),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          "RELATED BESPOKE GARMENTS",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.64,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 14,
                      ),
                      itemCount: _relatedProducts.length > 4 ? 4 : _relatedProducts.length,
                      itemBuilder: (context, index) {
                        return ProductCard(product: _relatedProducts[index]);
                      },
                    ),
                    const SizedBox(height: 20),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabButton(String tabKey, String label) {
    final isActive = _activeTab == tabKey;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeTab = tabKey),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: isActive ? const Color(0xFFF59E0B) : Colors.transparent,
                width: 2,
              ),
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isActive ? const Color(0xFFFBBF24) : Colors.white54,
              fontWeight: isActive ? FontWeight.w900 : FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSpecRow(String label, String value, {bool isLast = false}) {
    return Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white38, fontSize: 12)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _TrustPerkRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _TrustPerkRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: const Color(0xFFFBBF24), size: 16),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
        ),
      ],
    );
  }
}

/// Full-Screen Interactive Luxury Zoom Modal (Ultra HD Inspect)
class FullScreenImageZoomViewer extends StatefulWidget {
  final List<String> images;
  final int initialIndex;
  final String productName;

  const FullScreenImageZoomViewer({
    super.key,
    required this.images,
    this.initialIndex = 0,
    required this.productName,
  });

  static void show(
    BuildContext context, {
    required List<String> images,
    int initialIndex = 0,
    required String productName,
  }) {
    Navigator.push(
      context,
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.black.withOpacity(0.96),
        pageBuilder: (context, animation, secondaryAnimation) =>
            FullScreenImageZoomViewer(
          images: images,
          initialIndex: initialIndex,
          productName: productName,
        ),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  @override
  State<FullScreenImageZoomViewer> createState() => _FullScreenImageZoomViewerState();
}

class _FullScreenImageZoomViewerState extends State<FullScreenImageZoomViewer> {
  late int _currentIndex;
  final TransformationController _transformationController = TransformationController();
  TapDownDetails? _doubleTapDetails;
  double _currentScale = 1.0;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex.clamp(0, widget.images.length - 1);
    _transformationController.addListener(_onTransformationChanged);
  }

  @override
  void dispose() {
    _transformationController.removeListener(_onTransformationChanged);
    _transformationController.dispose();
    super.dispose();
  }

  void _onTransformationChanged() {
    final scale = _transformationController.value.getMaxScaleOnAxis();
    if (mounted && (_currentScale - scale).abs() > 0.05) {
      setState(() {
        _currentScale = scale;
      });
    }
  }

  void _handleDoubleTap() {
    if (_transformationController.value != Matrix4.identity()) {
      _resetZoom();
    } else {
      final position = _doubleTapDetails?.localPosition ?? Offset.zero;
      _setZoom(2.5, position);
    }
  }

  void _resetZoom() {
    _transformationController.value = Matrix4.identity();
    setState(() => _currentScale = 1.0);
  }

  void _setZoom(double scale, [Offset? origin]) {
    final size = MediaQuery.of(context).size;
    final x = origin?.dx ?? size.width / 2;
    final y = origin?.dy ?? size.height / 2;

    final translationX = -x * (scale - 1);
    final translationY = -y * (scale - 1);

    final zoomed = Matrix4.identity()
      ..setEntry(0, 0, scale)
      ..setEntry(1, 1, scale)
      ..setEntry(0, 3, translationX)
      ..setEntry(1, 3, translationY);

    _transformationController.value = zoomed;
    setState(() => _currentScale = scale);
  }

  void _zoomIn() {
    final target = (_currentScale + 0.5).clamp(1.0, 4.5);
    _setZoom(target);
  }

  void _zoomOut() {
    final target = (_currentScale - 0.5).clamp(1.0, 4.5);
    if (target <= 1.0) {
      _resetZoom();
    } else {
      _setZoom(target);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentImageUrl = widget.images.isNotEmpty
        ? widget.images[_currentIndex.clamp(0, widget.images.length - 1)]
        : '';

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Stack(
          children: [
            // 1. Center Interactive Canvas with Gesture Double-Tap & Pinch Zoom
            Center(
              child: GestureDetector(
                onDoubleTapDown: (d) => _doubleTapDetails = d,
                onDoubleTap: _handleDoubleTap,
                child: SizedBox.expand(
                  child: InteractiveViewer(
                    transformationController: _transformationController,
                    minScale: 0.9,
                    maxScale: 4.5,
                    panEnabled: true,
                    scaleEnabled: true,
                    boundaryMargin: const EdgeInsets.all(120),
                    child: Center(
                      child: ImageOptimizer.cachedImage(
                        imageUrl: currentImageUrl,
                        fit: BoxFit.contain,
                        memCacheWidth: 1440,
                        memCacheHeight: 2560,
                      ),
                    ),
                  ),
                ),
              ),
            ),

            // 2. Top Luxury Control Header Bar
            Positioned(
              top: 10,
              left: 14,
              right: 14,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF101015).withValues(alpha: 0.94),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF27272A)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.6),
                      blurRadius: 16,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // ROW 1: Product Title & Close Button
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            widget.productName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Close Button
                        GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444).withValues(alpha: 0.2),
                              shape: BoxShape.circle,
                              border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4)),
                            ),
                            child: const Icon(Icons.close, color: Colors.white, size: 16),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // ROW 2: Zoom Percentage & Interactive Zoom Controls
                    Row(
                      children: [
                        Text(
                          "🔍 Zoom: ${(_currentScale * 100).round()}%",
                          style: const TextStyle(
                            color: Color(0xFFFBBF24),
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Spacer(),

                        // Quick Zoom Presets
                        _buildZoomButton("1x", () => _resetZoom(), isActive: _currentScale <= 1.05),
                        const SizedBox(width: 5),
                        _buildZoomButton("2x", () => _setZoom(2.0), isActive: (_currentScale - 2.0).abs() < 0.2),
                        const SizedBox(width: 5),
                        _buildZoomButton("3.5x", () => _setZoom(3.5), isActive: _currentScale >= 3.0),
                        const SizedBox(width: 6),

                        // Zoom Out Button
                        GestureDetector(
                          onTap: _zoomOut,
                          child: Container(
                            width: 30,
                            height: 30,
                            decoration: BoxDecoration(
                              color: const Color(0xFF18181D),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFF27272A)),
                            ),
                            child: const Icon(Icons.remove, color: Colors.white70, size: 15),
                          ),
                        ),
                        const SizedBox(width: 5),

                        // Zoom In Button
                        GestureDetector(
                          onTap: _zoomIn,
                          child: Container(
                            width: 30,
                            height: 30,
                            decoration: BoxDecoration(
                              color: const Color(0xFF18181D),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFF27272A)),
                            ),
                            child: const Icon(Icons.add, color: Color(0xFFFBBF24), size: 15),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // 3. Bottom Multi-Image Gallery Thumbnails
            if (widget.images.length > 1)
              Positioned(
                bottom: 20,
                left: 0,
                right: 0,
                child: Center(
                  child: Container(
                    height: 64,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF101015).withOpacity(0.92),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFF27272A)),
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      scrollDirection: Axis.horizontal,
                      itemCount: widget.images.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final isSelected = _currentIndex == index;
                        return GestureDetector(
                          onTap: () {
                            _resetZoom();
                            setState(() => _currentIndex = index);
                          },
                          child: Container(
                            width: 50,
                            height: 50,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected ? const Color(0xFFF59E0B) : const Color(0xFF27272A),
                                width: isSelected ? 2 : 1,
                              ),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(9),
                              child: ImageOptimizer.cachedImage(
                                imageUrl: widget.images[index],
                                fit: BoxFit.cover,
                                memCacheWidth: 120,
                                memCacheHeight: 120,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildZoomButton(String label, VoidCallback onTap, {bool isActive = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFFF59E0B) : const Color(0xFF18181D),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isActive ? const Color(0xFFF59E0B) : const Color(0xFF27272A),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isActive ? Colors.black : Colors.white70,
            fontSize: 11,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

