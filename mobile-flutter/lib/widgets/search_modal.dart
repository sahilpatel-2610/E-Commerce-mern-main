import 'package:flutter/material.dart';
import '../models/product_model.dart';
import '../services/firebase_service.dart';
import '../utils/luxury_toast.dart';
import '../screens/product_detail_screen.dart';
import '../widgets/luxury_loader.dart';
import '../screens/collection_screen.dart';
import '../utils/image_optimizer.dart';

class SearchModal extends StatefulWidget {
  final Function(String query)? onNavigateToCollection;
  const SearchModal({super.key, this.onNavigateToCollection});

  static void show(BuildContext context, {Function(String query)? onNavigateToCollection}) {
    Navigator.push(
      context,
      PageRouteBuilder(
        opaque: true,
        pageBuilder: (context, animation, secondaryAnimation) =>
            SearchModal(onNavigateToCollection: onNavigateToCollection),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
      ),
    );
  }

  @override
  State<SearchModal> createState() => _SearchModalState();
}

class _SearchModalState extends State<SearchModal> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  List<Product> _allProducts = [];
  List<Product> _displayProducts = [];
  bool _loading = true;
  String _query = '';

  final List<String> _trendingTags = [
    "Gurkha Pant",
    "Korean Fit",
    "Festive Kurta",
    "Formal Shirt",
    "Cotton Pant",
    "Suit",
    "Blazer",
    "Denim",
  ];

  @override
  void initState() {
    super.initState();
    _loadProducts();
    // Auto focus search input after transition
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _focusNode.requestFocus();
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    final prods = await FirebaseService.getProducts();
    if (mounted) {
      setState(() {
        _allProducts = prods;
        _displayProducts = prods;
        _loading = false;
      });
    }
  }

  void _onSearchChanged(String text) {
    setState(() {
      _query = text.trim();
      if (_query.isEmpty) {
        _displayProducts = _allProducts;
      } else {
        final q = _query.toLowerCase();
        _displayProducts = _allProducts.where((p) {
          final title = p.name.toLowerCase();
          final category = p.category.toLowerCase();
          final subCat = p.subCategory.toLowerCase();
          final desc = p.description.toLowerCase();
          final brand = p.brand.toLowerCase();
          return title.contains(q) ||
              category.contains(q) ||
              subCat.contains(q) ||
              desc.contains(q) ||
              brand.contains(q);
        }).toList();
      }
    });
  }

  void _selectTag(String tag) {
    _searchController.text = tag;
    _onSearchChanged(tag);
  }

  void _viewAllInCollection() {
    final q = _query;
    Navigator.pop(context);
    if (widget.onNavigateToCollection != null) {
      widget.onNavigateToCollection!(q);
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CollectionScreen(initialSearch: q),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF07070A),
      body: SafeArea(
        child: Column(
          children: [
            // Top Header: Title, Sparkle Badge & Close Button
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.auto_awesome,
                          color: Color(0xFFFBBF24),
                          size: 16,
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "SEARCH LUXURY COLLECTION",
                            style: TextStyle(
                              color: Color(0xFFFBBF24),
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.2,
                            ),
                          ),
                          Text(
                            "Live Menswear Atelier Search",
                            style: TextStyle(
                              color: Colors.white54,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: const Color(0xFF16161D),
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFF27272A)),
                      ),
                      child: const Icon(Icons.close, color: Colors.white70, size: 16),
                    ),
                  ),
                ],
              ),
            ),

            const Divider(color: Color(0xFF1F1F24), height: 1),

            // Search Input Box
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                controller: _searchController,
                focusNode: _focusNode,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                onChanged: _onSearchChanged,
                onSubmitted: (_) => _viewAllInCollection(),
                decoration: InputDecoration(
                  hintText: "Search shirts, gurkha pants, kurtas, suits...",
                  hintStyle: const TextStyle(color: Colors.white38, fontSize: 13),
                  prefixIcon: const Icon(Icons.search, color: Color(0xFFF59E0B), size: 20),
                  suffixIcon: _query.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, color: Colors.white54, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            _onSearchChanged('');
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: const Color(0xFF111116),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Color(0xFF27272A)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Color(0xFF27272A)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Color(0xFFF59E0B), width: 1.5),
                  ),
                ),
              ),
            ),

            // Trending Tags Row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  const Text(
                    "TRENDING: ",
                    style: TextStyle(
                      color: Color(0xFF9CA3AF),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1,
                    ),
                  ),
                  Expanded(
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(),
                      child: Row(
                        children: _trendingTags.map((tag) {
                          final isSelected = _query.toLowerCase() == tag.toLowerCase();
                          return GestureDetector(
                            onTap: () => _selectTag(tag),
                            child: Container(
                              margin: const EdgeInsets.only(right: 6),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? const Color(0xFFF59E0B)
                                    : const Color(0xFF14141A),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isSelected
                                      ? const Color(0xFFF59E0B)
                                      : const Color(0xFF27272A),
                                ),
                              ),
                              child: Text(
                                tag,
                                style: TextStyle(
                                  color: isSelected ? Colors.black : Colors.white70,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 6),
            const Divider(color: Color(0xFF1F1F24), height: 1),

            // Results / Products List
            Expanded(
              child: _loading
                  ? const Center(
                      child: GoldenSweepLoader(size: 44),
                    )
                  : _displayProducts.isNotEmpty
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Result Count & View All Action
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 8),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    _query.isNotEmpty
                                        ? "Found ${_displayProducts.length} matching items"
                                        : "Popular Bespoke Garments (${_displayProducts.length})",
                                    style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: _viewAllInCollection,
                                    child: const Row(
                                      children: [
                                        Text(
                                          "View all in Collection",
                                          style: TextStyle(
                                            color: Color(0xFFFBBF24),
                                            fontSize: 12,
                                            fontWeight: FontWeight.w900,
                                          ),
                                        ),
                                        SizedBox(width: 4),
                                        Icon(
                                          Icons.arrow_forward,
                                          color: Color(0xFFFBBF24),
                                          size: 13,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            // Products List
                            Expanded(
                              child: ListView.separated(
                                padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                                itemCount: _displayProducts.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: 10),
                                itemBuilder: (context, index) {
                                  final p = _displayProducts[index];
                                  final imgUrl = p.images.isNotEmpty
                                      ? p.images.first
                                      : '';
                                  final hasDiscount =
                                      p.oldPrice > p.price && p.oldPrice > 0;
                                  final discountPct = hasDiscount
                                      ? (((p.oldPrice - p.price) / p.oldPrice) *
                                              100)
                                          .round()
                                      : 0;

                                  return GestureDetector(
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) =>
                                              ProductDetailScreen(product: p),
                                        ),
                                      );
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF101015),
                                        borderRadius:
                                            BorderRadius.circular(16),
                                        border: Border.all(
                                            color: const Color(0xFF27272A)),
                                      ),
                                      child: Row(
                                        children: [
                                          // Thumbnail
                                          ClipRRect(
                                            borderRadius:
                                                BorderRadius.circular(12),
                                            child: Container(
                                              width: 58,
                                              height: 58,
                                              color: const Color(0xFF000000),
                                              child: ImageOptimizer.cachedImage(
                                                imageUrl: imgUrl,
                                                width: 58,
                                                height: 58,
                                                memCacheWidth: 200,
                                                memCacheHeight: 200,
                                                fit: BoxFit.cover,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          // Details
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  p.name,
                                                  maxLines: 1,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                  style: const TextStyle(
                                                    color: Colors.white,
                                                    fontSize: 13,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  "${p.category}${p.subCategory.isNotEmpty ? ' • ${p.subCategory}' : ''}",
                                                  style: const TextStyle(
                                                    color: Color(0xFF9CA3AF),
                                                    fontSize: 11,
                                                  ),
                                                ),
                                                const SizedBox(height: 4),
                                                Row(
                                                  children: [
                                                    Text(
                                                      "₹${p.price.toStringAsFixed(0)}",
                                                      style: const TextStyle(
                                                        color:
                                                            Color(0xFFFBBF24),
                                                        fontSize: 13,
                                                        fontWeight:
                                                            FontWeight.w900,
                                                      ),
                                                    ),
                                                    if (hasDiscount) ...[
                                                      const SizedBox(width: 6),
                                                      Text(
                                                        "₹${p.oldPrice.toStringAsFixed(0)}",
                                                        style: const TextStyle(
                                                          color: Colors.white38,
                                                          fontSize: 11,
                                                          decoration:
                                                              TextDecoration
                                                                  .lineThrough,
                                                        ),
                                                      ),
                                                      const SizedBox(width: 6),
                                                      Container(
                                                        padding:
                                                            const EdgeInsets
                                                                .symmetric(
                                                                horizontal: 5,
                                                                vertical: 1.5),
                                                        decoration:
                                                            BoxDecoration(
                                                          color: const Color(
                                                                  0xFFEF4444)
                                                              .withOpacity(0.2),
                                                          borderRadius:
                                                              BorderRadius
                                                                  .circular(4),
                                                          border: Border.all(
                                                              color: const Color(
                                                                      0xFFEF4444)
                                                                  .withOpacity(
                                                                      0.4)),
                                                        ),
                                                        child: Text(
                                                          "$discountPct% OFF",
                                                          style:
                                                              const TextStyle(
                                                            color: Color(
                                                                0xFFF87171),
                                                            fontSize: 11,
                                                            fontWeight:
                                                                FontWeight.w900,
                                                          ),
                                                        ),
                                                      ),
                                                    ],
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                          const Icon(
                                            Icons.chevron_right,
                                            color: Colors.white24,
                                            size: 18,
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ],
                        )
                      : Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF141418),
                                  shape: BoxShape.circle,
                                  border:
                                      Border.all(color: const Color(0xFF27272A)),
                                ),
                                child: const Icon(
                                  Icons.search_off_rounded,
                                  color: Color(0xFFFBBF24),
                                  size: 36,
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                "No matching garments found for '$_query'",
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                "Try searching for 'Gurkha', 'Shirt', 'Pant', or 'Kurta'",
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: Colors.white54,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
