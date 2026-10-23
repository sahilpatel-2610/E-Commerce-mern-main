import 'package:flutter/material.dart';
import '../models/product_model.dart';
import '../widgets/luxury_header_actions.dart';
import '../widgets/search_modal.dart';
import '../widgets/luxury_loader.dart';
import '../services/firebase_service.dart';
import '../widgets/product_card.dart';

class CollectionScreen extends StatefulWidget {
  final String? initialSearch;
  const CollectionScreen({super.key, this.initialSearch});

  @override
  State<CollectionScreen> createState() => _CollectionScreenState();
}

class _CollectionScreenState extends State<CollectionScreen> {
  List<Product> _allProducts = [];
  List<Product> _filteredProducts = [];
  bool _loading = true;
  String _searchQuery = "";
  String _selectedSort = "Relevant";

  // Multi-select filters matching MERN Collection.jsx
  final Set<String> _selectedCategories = {};
  final Set<String> _selectedSubcategories = {};
  final Set<String> _selectedBrands = {};

  // Dynamic filter lists and counts
  Map<String, int> _categoryCounts = {};
  Map<String, int> _subcategoryCounts = {};
  Map<String, int> _brandCounts = {};

  final List<String> _sortOptions = [
    "Relevant",
    "Price: Low to High",
    "Price: High to Low",
    "Highest Rated",
  ];

  late final TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    _searchQuery = widget.initialSearch ?? "";
    _searchController = TextEditingController(text: _searchQuery);
    _loadCatalog();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCatalog() async {
    final prods = await FirebaseService.getProducts();

    final catMap = <String, int>{};
    final subMap = <String, int>{};
    final brandMap = <String, int>{};

    for (var p in prods) {
      if (p.category.isNotEmpty) {
        catMap[p.category] = (catMap[p.category] ?? 0) + 1;
      }
      if (p.subCategory.isNotEmpty) {
        subMap[p.subCategory] = (subMap[p.subCategory] ?? 0) + 1;
      }
      if (p.brand.isNotEmpty) {
        brandMap[p.brand] = (brandMap[p.brand] ?? 0) + 1;
      }
    }

    if (mounted) {
      setState(() {
        _allProducts = prods;
        _categoryCounts = catMap;
        _subcategoryCounts = subMap;
        _brandCounts = brandMap;
        _filteredProducts = prods;
        _loading = false;
      });
      _applyFilters();
    }
  }

  void _applyFilters() {
    List<Product> list = _allProducts.where((p) {
      // 1. Search Query
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final match = p.name.toLowerCase().contains(q) ||
            p.category.toLowerCase().contains(q) ||
            p.subCategory.toLowerCase().contains(q) ||
            p.brand.toLowerCase().contains(q);
        if (!match) return false;
      }

      // 2. Categories Multi-Select
      if (_selectedCategories.isNotEmpty) {
        if (!_selectedCategories.contains(p.category)) return false;
      }

      // 3. Subcategories Multi-Select
      if (_selectedSubcategories.isNotEmpty) {
        if (!_selectedSubcategories.contains(p.subCategory)) return false;
      }

      // 4. Brands Multi-Select
      if (_selectedBrands.isNotEmpty) {
        if (!_selectedBrands.contains(p.brand)) return false;
      }

      return true;
    }).toList();

    // Sorting
    switch (_selectedSort) {
      case "Price: Low to High":
        list.sort((a, b) => a.price.compareTo(b.price));
        break;
      case "Price: High to Low":
        list.sort((a, b) => b.price.compareTo(a.price));
        break;
      case "Highest Rated":
        list.sort((a, b) => b.rating.compareTo(a.rating));
        break;
      default:
        // Relevant / Natural Firestore order
        break;
    }

    setState(() {
      _filteredProducts = list;
    });
  }

  void _clearAllFilters() {
    setState(() {
      _selectedCategories.clear();
      _selectedSubcategories.clear();
      _selectedBrands.clear();
      _searchQuery = "";
      _searchController.clear();
    });
    _applyFilters();
  }

  int get _activeFilterCount =>
      _selectedCategories.length + _selectedSubcategories.length + _selectedBrands.length;

  void _showFilterModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0C0C10),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return SafeArea(
              child: Container(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.82,
                ),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Modal Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Text(
                              "FILTERS ",
                              style: TextStyle(color: Color(0xFFF59E0B), fontSize: 18, fontWeight: FontWeight.w900),
                            ),
                            if (_activeFilterCount > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF59E0B),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  '$_activeFilterCount',
                                  style: const TextStyle(color: Colors.black, fontSize: 11, fontWeight: FontWeight.w900),
                                ),
                              ),
                          ],
                        ),
                        if (_activeFilterCount > 0)
                          TextButton(
                            onPressed: () {
                              _clearAllFilters();
                              setModalState(() {});
                            },
                            child: const Text("Clear All", style: TextStyle(color: Color(0xFFFBBF24), fontSize: 12)),
                          ),
                      ],
                    ),
                    const Divider(color: Color(0xFF27272A)),

                    // Scrollable Filter Sections
                    Expanded(
                      child: ListView(
                        children: [
                          // Categories
                          if (_categoryCounts.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            const Text(
                              "CATEGORIES",
                              style: TextStyle(
                                color: Color(0xFFFBBF24),
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1,
                              ),
                            ),
                            const SizedBox(height: 8),
                            ..._categoryCounts.entries.map((e) {
                              final isChecked = _selectedCategories.contains(e.key);
                              return CheckboxListTile(
                                contentPadding: EdgeInsets.zero,
                                activeColor: const Color(0xFFF59E0B),
                                checkColor: Colors.black,
                                title: Text(e.key, style: TextStyle(color: isChecked ? const Color(0xFFFBBF24) : Colors.white, fontSize: 13)),
                                secondary: Text('${e.value}', style: const TextStyle(color: Colors.white38, fontSize: 11)),
                                value: isChecked,
                                onChanged: (val) {
                                  setModalState(() {
                                    if (val == true) {
                                      _selectedCategories.add(e.key);
                                    } else {
                                      _selectedCategories.remove(e.key);
                                    }
                                  });
                                  _applyFilters();
                                },
                              );
                            }),
                          ],

                          // Subcategories
                          if (_subcategoryCounts.isNotEmpty) ...[
                            const SizedBox(height: 16),
                            const Text(
                              "SUBCATEGORIES",
                              style: TextStyle(
                                color: Color(0xFFFBBF24),
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1,
                              ),
                            ),
                            const SizedBox(height: 8),
                            ..._subcategoryCounts.entries.map((e) {
                              final isChecked = _selectedSubcategories.contains(e.key);
                              return CheckboxListTile(
                                contentPadding: EdgeInsets.zero,
                                activeColor: const Color(0xFFF59E0B),
                                checkColor: Colors.black,
                                title: Text(e.key, style: TextStyle(color: isChecked ? const Color(0xFFFBBF24) : Colors.white, fontSize: 13)),
                                secondary: Text('${e.value}', style: const TextStyle(color: Colors.white38, fontSize: 11)),
                                value: isChecked,
                                onChanged: (val) {
                                  setModalState(() {
                                    if (val == true) {
                                      _selectedSubcategories.add(e.key);
                                    } else {
                                      _selectedSubcategories.remove(e.key);
                                    }
                                  });
                                  _applyFilters();
                                },
                              );
                            }),
                          ],

                          // Brands
                          if (_brandCounts.isNotEmpty) ...[
                            const SizedBox(height: 16),
                            const Text(
                              "BRANDS",
                              style: TextStyle(
                                color: Color(0xFFFBBF24),
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1,
                              ),
                            ),
                            const SizedBox(height: 8),
                            ..._brandCounts.entries.map((e) {
                              final isChecked = _selectedBrands.contains(e.key);
                              return CheckboxListTile(
                                contentPadding: EdgeInsets.zero,
                                activeColor: const Color(0xFFF59E0B),
                                checkColor: Colors.black,
                                title: Text(e.key, style: TextStyle(color: isChecked ? const Color(0xFFFBBF24) : Colors.white, fontSize: 13)),
                                secondary: Text('${e.value}', style: const TextStyle(color: Colors.white38, fontSize: 11)),
                                value: isChecked,
                                onChanged: (val) {
                                  setModalState(() {
                                    if (val == true) {
                                      _selectedBrands.add(e.key);
                                    } else {
                                      _selectedBrands.remove(e.key);
                                    }
                                  });
                                  _applyFilters();
                                },
                              );
                            }),
                          ],
                        ],
                      ),
                    ),

                    // Apply Button
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF59E0B),
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        onPressed: () => Navigator.pop(ctx),
                        child: Text(
                          "APPLY FILTERS (${_filteredProducts.length} PRODUCTS)",
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF050505),
      appBar: AppBar(
        backgroundColor: const Color(0xFF09090B),
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text(
          "ALL COLLECTIONS",
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
              _loadCatalog();
            },
            tooltip: "Refresh Catalog",
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // 1. Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
            child: TextField(
              controller: _searchController,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              onChanged: (val) {
                _searchQuery = val;
                _applyFilters();
              },
              decoration: InputDecoration(
                hintText: "Search luxury bespoke attire...",
                hintStyle: const TextStyle(color: Colors.white38, fontSize: 13),
                prefixIcon: const Icon(Icons.search, color: Color(0xFFF59E0B), size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: Colors.white54, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          _searchQuery = "";
                          _applyFilters();
                        },
                      )
                    : null,
                filled: true,
                fillColor: const Color(0xFF101014),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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

          // 2. Filter & Sort Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            child: Row(
              children: [
                // Filter Trigger Button
                GestureDetector(
                  onTap: _showFilterModal,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF101014),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _activeFilterCount > 0 ? const Color(0xFFF59E0B) : const Color(0xFF27272A),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.filter_list,
                          color: _activeFilterCount > 0 ? const Color(0xFFFBBF24) : Colors.white70,
                          size: 16,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          "FILTERS",
                          style: TextStyle(
                            color: _activeFilterCount > 0 ? const Color(0xFFFBBF24) : Colors.white,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                          ),
                        ),
                        if (_activeFilterCount > 0) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.all(5),
                            decoration: const BoxDecoration(
                              color: Color(0xFFF59E0B),
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              '$_activeFilterCount',
                              style: const TextStyle(color: Colors.black, fontSize: 11, fontWeight: FontWeight.w900),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const Spacer(),

                // Sort Dropdown
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF101014),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF27272A)),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedSort,
                      dropdownColor: const Color(0xFF0F0F12),
                      icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFFFBBF24), size: 18),
                      style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() => _selectedSort = val);
                          _applyFilters();
                        }
                      },
                      items: _sortOptions.map((opt) {
                        return DropdownMenuItem<String>(
                          value: opt,
                          child: Text(
                            opt,
                            style: TextStyle(
                              color: opt == _selectedSort ? const Color(0xFFFBBF24) : Colors.white,
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

          // 3. Product Grid
          Expanded(
            child: _loading
                ? const Center(
                    child: GoldenSweepLoader(size: 50),
                  )
                : RefreshIndicator(
                    color: const Color(0xFFF59E0B),
                    backgroundColor: const Color(0xFF18181B),
                    onRefresh: _loadCatalog,
                    child: _filteredProducts.isEmpty
                        ? ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: [
                              SizedBox(height: MediaQuery.of(context).size.height * 0.15),
                              Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(20),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF121216),
                                        shape: BoxShape.circle,
                                        border: Border.all(color: const Color(0xFF27272A)),
                                      ),
                                      child: const Icon(Icons.inventory_2_outlined, color: Color(0xFFFBBF24), size: 40),
                                    ),
                                    const SizedBox(height: 16),
                                    const Text(
                                      "NO PRODUCTS FOUND",
                                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
                                    ),
                                    const SizedBox(height: 6),
                                    const Text(
                                      "Try adjusting or clearing your filters.",
                                      style: TextStyle(color: Colors.white54, fontSize: 12),
                                    ),
                                    const SizedBox(height: 16),
                                    ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFFF59E0B),
                                        foregroundColor: Colors.black,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      ),
                                      onPressed: _clearAllFilters,
                                      child: const Text("Reset All Filters", style: TextStyle(fontWeight: FontWeight.bold)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          )
                        : GridView.builder(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.all(14),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 0.64,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 14,
                            ),
                            itemCount: _filteredProducts.length,
                            itemBuilder: (context, index) {
                              return ProductCard(product: _filteredProducts[index]);
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }
}
