import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/firebase_service.dart';
import '../utils/image_optimizer.dart';
import '../utils/luxury_toast.dart';
import '../widgets/luxury_loader.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<Map<String, dynamic>> _orderItems = [];
  bool _loading = true;
  String _activeTab = "All"; // "All", "Order Placed", "Processing", "Shipped", "Delivered"
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = "";

  @override
  void initState() {
    super.initState();
    _populateFromCacheFirst();
    _loadOrderData();
  }

  void _populateFromCacheFirst() {
    final cached = FirebaseService.getCachedOrders();
    if (cached.isNotEmpty) {
      final items = _flattenOrders(cached);
      if (items.isNotEmpty) {
        setState(() {
          _orderItems = items;
          _loading = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> _flattenOrders(List<Map<String, dynamic>> ordersList) {
    final List<Map<String, dynamic>> flatItems = [];
    for (final order in ordersList) {
      final rawItems = order['items'];
      final List<dynamic> items = (rawItems is List) ? rawItems : [];
      final orderId = (order['_id'] ?? order['id'] ?? 'ORD').toString();
      final status = (order['status'] ?? 'Order Placed').toString();
      final paymentMethod = (order['paymentMethod'] ?? 'COD').toString();
      final dateStr = (order['date'] ?? order['createdAt'] ?? '').toString();
      final dynamic address = order['address'];

      if (items.isEmpty) {
        flatItems.add({
          'orderId': orderId,
          'name': order['productName'] ?? order['customerName'] ?? 'Bespoke Item',
          'price': order['amount'] ?? 0,
          'quantity': 1,
          'size': 'Standard',
          'image': order['image'] ?? '',
          'status': status,
          'paymentMethod': paymentMethod,
          'date': dateStr,
          'address': address,
        });
      } else {
        for (final item in items) {
          final itemMap = item is Map ? Map<String, dynamic>.from(item) : <String, dynamic>{};
          final itemImg = (itemMap['images'] is List && (itemMap['images'] as List).isNotEmpty)
              ? (itemMap['images'] as List).first
              : ((itemMap['image'] is List && (itemMap['image'] as List).isNotEmpty)
                  ? (itemMap['image'] as List).first
                  : (itemMap['image'] ?? order['image'] ?? ''));

          flatItems.add({
            'orderId': orderId,
            'name': itemMap['name'] ?? itemMap['title'] ?? 'Luxury Bespoke Garment',
            'price': itemMap['price'] ?? order['amount'] ?? 0,
            'quantity': itemMap['quantity'] ?? 1,
            'size': itemMap['size'] ?? 'M',
            'image': itemImg,
            'status': status,
            'paymentMethod': paymentMethod,
            'date': dateStr,
            'address': address,
          });
        }
      }
    }
    return flatItems.reversed.toList();
  }

  Future<void> _loadOrderData() async {
    if (_orderItems.isEmpty) {
      setState(() => _loading = true);
    }
    final sp = await SharedPreferences.getInstance();
    final userEmail = (sp.getString('userEmail') ?? '').toLowerCase().trim();
    final userId = sp.getString('userId') ?? '';
    final userRole = (sp.getString('userRole') ?? '').toLowerCase();

    // 100% Live Fetch from Firebase Firestore
    final allOrders = await FirebaseService.getOrders();
    List<Map<String, dynamic>> matchingOrders = allOrders;

    if (userEmail.isNotEmpty && !userRole.contains('admin')) {
      final userSpecific = allOrders.where((order) {
        String ordEmail = (order['userEmail'] ?? order['customerEmail'] ?? '').toString();
        if (ordEmail.isEmpty && order['address'] is Map) {
          ordEmail = ((order['address'] as Map)['email'] ?? '').toString();
        }
        ordEmail = ordEmail.toLowerCase().trim();
        final ordUserId = (order['userId'] ?? '').toString();
        return (userEmail.isNotEmpty && ordEmail == userEmail) || (userId.isNotEmpty && ordUserId == userId);
      }).toList();

      if (userSpecific.isNotEmpty) {
        matchingOrders = userSpecific;
      }
    }

    final flatItems = _flattenOrders(matchingOrders);

    if (mounted) {
      setState(() {
        _orderItems = flatItems;
        _loading = false;
      });
    }
  }

  int _getStatusLevel(String status) {
    final s = status.toLowerCase();
    if (s.contains("deliver")) return 4;
    if (s.contains("ship") || s.contains("way") || s.contains("transit")) return 3;
    if (s.contains("process") || s.contains("pack")) return 2;
    return 1; // Order Placed
  }

  Color _getStatusColor(String status) {
    final lvl = _getStatusLevel(status);
    switch (lvl) {
      case 4:
        return const Color(0xFF10B981); // Emerald
      case 3:
        return const Color(0xFF38BDF8); // Sky
      case 2:
        return const Color(0xFF818CF8); // Indigo
      default:
        return const Color(0xFFF59E0B); // Amber
    }
  }

  String _formatDate(String raw) {
    if (raw.isEmpty) return "Recent Order";
    try {
      if (int.tryParse(raw) != null) {
        final dt = DateTime.fromMillisecondsSinceEpoch(int.parse(raw));
        return "${dt.day} ${_getMonth(dt.month)}, ${dt.year}";
      }
      final dt = DateTime.parse(raw);
      return "${dt.day} ${_getMonth(dt.month)}, ${dt.year}";
    } catch (_) {
      return raw;
    }
  }

  String _getMonth(int m) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (m >= 1 && m <= 12) return months[m - 1];
    return "";
  }

  void _showTrackingModal(Map<String, dynamic> item) {
    final status = (item['status'] ?? 'Order Placed').toString();
    final activeIdx = _getStatusLevel(status) - 1;
    final steps = ['Order Placed', 'Packing & Quality Check', 'Shipped in Transit', 'Delivered'];

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF09090D),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        side: BorderSide(color: Color(0xFF27272A)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(22, 20, 22, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.local_shipping_outlined, color: Color(0xFFFBBF24), size: 20),
                    const SizedBox(width: 8),
                    const Text(
                      "LIVE ORDER TRACKING",
                      style: TextStyle(
                        color: Color(0xFFFBBF24),
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
                GestureDetector(
                  onTap: () => Navigator.pop(ctx),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Color(0xFF27272A),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close, color: Colors.white70, size: 16),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              "Order ID: #${item['orderId']}",
              style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
            ),
            const SizedBox(height: 20),
            Column(
              children: List.generate(steps.length, (i) {
                final isDone = i <= activeIdx;
                final isCurrent = i == activeIdx;
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      children: [
                        Container(
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isDone ? const Color(0xFFF59E0B) : const Color(0xFF18181B),
                            border: Border.all(
                              color: isCurrent ? const Color(0xFFFBBF24) : (isDone ? const Color(0xFFF59E0B) : const Color(0xFF3F3F46)),
                              width: 2,
                            ),
                          ),
                          child: Icon(
                            isDone ? Icons.check : Icons.circle,
                            size: 14,
                            color: isDone ? Colors.black : Colors.white24,
                          ),
                        ),
                        if (i < steps.length - 1)
                          Container(
                            width: 2,
                            height: 32,
                            color: isDone ? const Color(0xFFF59E0B) : const Color(0xFF27272A),
                          ),
                      ],
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            steps[i],
                            style: TextStyle(
                              color: isDone ? Colors.white : Colors.white38,
                              fontWeight: isCurrent ? FontWeight.w900 : FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                          if (isCurrent)
                            Text(
                              "Current Status • Real-time Firebase Sync",
                              style: TextStyle(color: _getStatusColor(status), fontSize: 11),
                            ),
                          const SizedBox(height: 14),
                        ],
                      ),
                    ),
                  ],
                );
              }),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF27272A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () => Navigator.pop(ctx),
                child: const Text("Close Tracking"),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _copyOrderId(String orderId) {
    Clipboard.setData(ClipboardData(text: orderId));
    LuxuryToast.showSuccess(context, "Order ID copied to clipboard!", title: "COPIED");
  }

  void _showInvoiceModal(Map<String, dynamic> item) {
    final dynamic address = item['address'];
    String customerName = "Valued Customer";
    String customerEmail = "";
    String customerPhone = "";
    String fullAddress = "Standard Delivery Address";

    if (address is Map) {
      final fName = address['firstName'] ?? '';
      final lName = address['lastName'] ?? '';
      if (fName.isNotEmpty || lName.isNotEmpty) {
        customerName = "$fName $lName".trim();
      }
      customerEmail = (address['email'] ?? '').toString();
      customerPhone = (address['phone'] ?? '').toString();
      final street = address['street'] ?? address['address'] ?? '';
      final city = address['city'] ?? '';
      final state = address['state'] ?? '';
      final pin = address['zipcode'] ?? address['pinCode'] ?? '';
      fullAddress = [street, city, state, pin].where((s) => s.toString().isNotEmpty).join(', ');
    } else if (address is String && address.isNotEmpty) {
      fullAddress = address;
    }

    final double price = double.tryParse(item['price']?.toString() ?? '0') ?? 0;
    final int qty = int.tryParse(item['quantity']?.toString() ?? '1') ?? 1;
    final double total = price * qty;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0D0D12),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        side: BorderSide(color: Color(0xFF27272A)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 30),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.receipt_long_outlined, color: Color(0xFFFBBF24), size: 20),
                    SizedBox(width: 8),
                    Text(
                      "OFFICIAL INVOICE & RECEIPT",
                      style: TextStyle(color: Color(0xFFFBBF24), fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1),
                    ),
                  ],
                ),
                GestureDetector(
                  onTap: () => Navigator.pop(ctx),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(color: Color(0xFF27272A), shape: BoxShape.circle),
                    child: const Icon(Icons.close, color: Colors.white70, size: 16),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF141418),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF27272A)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Text(
                          "Order #${item['orderId']}",
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'monospace', fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(_formatDate(item['date'] ?? ''), style: const TextStyle(color: Colors.white54, fontSize: 11)),
                    ],
                  ),
                  const Divider(color: Color(0xFF27272A), height: 16),
                  Text("Billed To: $customerName", style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
                  if (customerEmail.isNotEmpty) Text("Email: $customerEmail", style: const TextStyle(color: Colors.white38, fontSize: 11)),
                  if (customerPhone.isNotEmpty) Text("Phone: $customerPhone", style: const TextStyle(color: Colors.white38, fontSize: 11)),
                  const SizedBox(height: 4),
                  Text("Delivery Address: $fullAddress", style: const TextStyle(color: Colors.white54, fontSize: 11)),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF141418),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF27272A)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text(item['name'] ?? 'Bespoke Garment', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12))),
                      Text("₹${price.toStringAsFixed(0)} x $qty", style: const TextStyle(color: Colors.white70, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("Size: ${item['size']}", style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.bold)),
                      Text("Payment: ${item['paymentMethod']}", style: const TextStyle(color: Colors.white54, fontSize: 11)),
                    ],
                  ),
                  const Divider(color: Color(0xFF27272A), height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Total Paid", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                      Text("₹${total.toStringAsFixed(0)}.00", style: const TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.w900, fontSize: 16, fontFamily: 'monospace')),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  LuxuryToast.showSuccess(context, "Invoice verified with Firebase Atelier", title: "INVOICE READY");
                },
                child: const Text("DISMISS INVOICE", style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 0.5)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Filter Orders
    final filtered = _orderItems.where((item) {
      final lvl = _getStatusLevel(item['status'] ?? '');
      bool tabMatch = true;
      if (_activeTab == "Order Placed") tabMatch = (lvl == 1);
      if (_activeTab == "Processing") tabMatch = (lvl == 2);
      if (_activeTab == "Shipped") tabMatch = (lvl == 3);
      if (_activeTab == "Delivered") tabMatch = (lvl == 4);

      if (!tabMatch) return false;

      if (_searchQuery.isNotEmpty) {
        final name = (item['name'] ?? '').toString().toLowerCase();
        final ordId = (item['orderId'] ?? '').toString().toLowerCase();
        final pay = (item['paymentMethod'] ?? '').toString().toLowerCase();
        final q = _searchQuery.toLowerCase();
        return name.contains(q) || ordId.contains(q) || pay.contains(q);
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF09090B),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFFFBBF24), size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          "MY ORDERS",
          style: TextStyle(
            color: Color(0xFFFBBF24),
            fontSize: 15,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
          ),
        ),
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: _loadOrderData,
        color: const Color(0xFFF59E0B),
        backgroundColor: const Color(0xFF141418),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ================= 1. EXACT MERN TITLE COMPONENT =================
              Container(
                padding: const EdgeInsets.only(bottom: 12),
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: Color(0xFF27272A), width: 1)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text(
                          "MY ",
                          style: TextStyle(
                            color: Color(0xFFFBBF24),
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          ),
                        ),
                        const Text(
                          "ORDERS",
                          style: TextStyle(
                            color: Color(0xFFE5E7EB),
                            fontSize: 22,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Container(
                          width: 40,
                          height: 2,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFF59E0B), Color(0xFFFBBF24)],
                            ),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      "Track your luxury bespoke purchases, view invoices, and monitor live delivery updates.",
                      style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // ================= 2. SEARCH BAR =================
              TextField(
                controller: _searchController,
                onChanged: (val) => setState(() => _searchQuery = val.trim()),
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: "Search orders by item name, ID, or payment...",
                  hintStyle: const TextStyle(color: Color(0xFF52525B), fontSize: 12),
                  prefixIcon: const Icon(Icons.search, color: Color(0xFFFBBF24), size: 18),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? GestureDetector(
                          onTap: () {
                            _searchController.clear();
                            setState(() => _searchQuery = "");
                          },
                          child: const Icon(Icons.close, color: Colors.white60, size: 16),
                        )
                      : null,
                  filled: true,
                  fillColor: const Color(0xFF14141A),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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

              const SizedBox(height: 14),

              // ================= 3. FILTER TABS (All, Placed, Processing, Shipped, Delivered) =================
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildTabChip("All", _orderItems.length),
                    _buildTabChip("Order Placed", _orderItems.where((i) => _getStatusLevel(i['status'] ?? '') == 1).length),
                    _buildTabChip("Processing", _orderItems.where((i) => _getStatusLevel(i['status'] ?? '') == 2).length),
                    _buildTabChip("Shipped", _orderItems.where((i) => _getStatusLevel(i['status'] ?? '') == 3).length),
                    _buildTabChip("Delivered", _orderItems.where((i) => _getStatusLevel(i['status'] ?? '') == 4).length),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // ================= 4. ORDERS LIST =================
              if (_loading) ...[
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Center(
                    child: GoldenSweepLoader(size: 50),
                  ),
                ),
              ] else if (filtered.isEmpty) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 50, horizontal: 20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D0D12),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFF27272A)),
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 60,
                        height: 60,
                        decoration: const BoxDecoration(
                          color: Color(0xFF18181B),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.shopping_bag_outlined, color: Color(0xFFFBBF24), size: 30),
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        "No Orders Found",
                        style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        "You have no orders matching this filter.",
                        style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 14),
                  itemBuilder: (ctx, i) {
                    final item = filtered[i];
                    final status = (item['status'] ?? 'Order Placed').toString();
                    final statusColor = _getStatusColor(status);
                    final orderId = (item['orderId'] ?? '').toString();
                    final imageUrl = (item['image'] ?? '').toString();

                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0D0D12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF27272A)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.6),
                            blurRadius: 14,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // 1. Top Meta Bar (Order ID + Date + Copy)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Flexible(
                                child: GestureDetector(
                                  onTap: () => _copyOrderId(orderId),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF18181B),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFF27272A)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Flexible(
                                          child: Text(
                                            "ORDER #${orderId.length > 12 ? orderId.substring(0, 12) : orderId}",
                                            style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 5),
                                        const Icon(
                                          Icons.copy_rounded,
                                          color: Colors.white38,
                                          size: 14,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF18181B),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  item['paymentMethod'] ?? 'COD',
                                  style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.w900),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 12),
                          const Divider(color: Color(0xFF27272A), height: 1),
                          const SizedBox(height: 12),

                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Product Thumbnail
                              Container(
                                width: 72,
                                height: 86,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF18181B),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFF3F3F46)),
                                ),
                                child: ImageOptimizer.cachedImage(
                                  imageUrl: imageUrl,
                                  width: 72,
                                  height: 86,
                                  memCacheWidth: 200,
                                  borderRadius: BorderRadius.circular(11),
                                ),
                              ),
                              const SizedBox(width: 14),

                              // Item Details
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item['name'] ?? 'Bespoke Item',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14.5,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        Text(
                                          "₹${item['price']}",
                                          style: const TextStyle(
                                            color: Color(0xFFFBBF24),
                                            fontWeight: FontWeight.w900,
                                            fontSize: 15,
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Text(
                                          "Qty: ${item['quantity']}",
                                          style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 12.5, fontWeight: FontWeight.w600),
                                        ),
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF27272A),
                                            borderRadius: BorderRadius.circular(5),
                                          ),
                                          child: Text(
                                            "Size: ${item['size']}",
                                            style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        Text(
                                          "Date: ${_formatDate(item['date'] ?? '')}",
                                          style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                                        ),
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF1E1E28),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            item['paymentMethod'] ?? 'COD',
                                            style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 10.5, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 14),
                          const Divider(color: Color(0xFF27272A), height: 1),
                          const SizedBox(height: 12),

                          // 3. Live 4-Stage Visual Stepper (Matching MERN Orders.jsx)
                          Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF141418),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFF27272A)),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                _buildStepNode(1, 'Placed', '✓', _getStatusLevel(status) >= 1, _getStatusLevel(status) == 1),
                                _buildStepDivider(_getStatusLevel(status) >= 2),
                                _buildStepNode(2, 'Packed', '📦', _getStatusLevel(status) >= 2, _getStatusLevel(status) == 2),
                                _buildStepDivider(_getStatusLevel(status) >= 3),
                                _buildStepNode(3, 'Shipped', '🚚', _getStatusLevel(status) >= 3, _getStatusLevel(status) == 3),
                                _buildStepDivider(_getStatusLevel(status) >= 4),
                                _buildStepNode(4, 'Delivered', '✨', _getStatusLevel(status) >= 4, _getStatusLevel(status) == 4),
                              ],
                            ),
                          ),

                          const SizedBox(height: 14),

                          // 4. Bottom Row: Status Badge + Invoice & Track Buttons
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              // Status Badge
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: statusColor.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 6,
                                      height: 6,
                                      decoration: BoxDecoration(
                                        color: statusColor,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 5),
                                    Text(
                                      status,
                                      style: TextStyle(
                                        color: statusColor,
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              // Actions: Invoice & Track Order
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: Colors.white70,
                                      side: const BorderSide(color: Color(0xFF3F3F46)),
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                    onPressed: () => _showInvoiceModal(item),
                                    icon: const Icon(Icons.receipt_outlined, size: 13, color: Color(0xFFFBBF24)),
                                    label: const Text("Invoice", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFFF59E0B),
                                      foregroundColor: Colors.black,
                                      elevation: 2,
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                    onPressed: () => _showTrackingModal(item),
                                    icon: const Icon(Icons.my_location_rounded, size: 13, color: Colors.black),
                                    label: const Text(
                                      "Track",
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepNode(int stepNum, String label, String icon, bool isDone, bool isCurrent) {
    return Column(
      children: [
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isDone ? const Color(0xFFF59E0B) : const Color(0xFF1E1E24),
            border: Border.all(
              color: isCurrent ? const Color(0xFFFBBF24) : (isDone ? const Color(0xFFF59E0B) : const Color(0xFF3F3F46)),
              width: 1.5,
            ),
          ),
          child: Center(
            child: Text(
              icon,
              style: TextStyle(
                fontSize: 11,
                color: isDone ? Colors.black : Colors.white38,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10.5,
            color: isCurrent ? const Color(0xFFFBBF24) : (isDone ? Colors.white70 : Colors.white30),
            fontWeight: isCurrent ? FontWeight.bold : FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildStepDivider(bool isDone) {
    return Container(
      width: 16,
      height: 2,
      margin: const EdgeInsets.only(bottom: 12),
      color: isDone ? const Color(0xFFF59E0B) : const Color(0xFF27272A),
    );
  }

  Widget _buildTabChip(String title, int count) {
    final isSelected = _activeTab == title;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = title),
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF59E0B) : const Color(0xFF14141A),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFFF59E0B) : const Color(0xFF27272A),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: TextStyle(
                color: isSelected ? Colors.black : const Color(0xFFD1D5DB),
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                fontSize: 13,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected ? Colors.black.withValues(alpha: 0.2) : const Color(0xFF27272A),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                count.toString(),
                style: TextStyle(
                  color: isSelected ? Colors.black : const Color(0xFF9CA3AF),
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
