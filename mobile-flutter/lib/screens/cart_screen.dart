import 'package:flutter/material.dart';
import '../services/cart_service.dart';
import '../utils/luxury_toast.dart';
import '../utils/image_optimizer.dart';
import '../widgets/luxury_loader.dart';
import 'place_order_screen.dart';
import 'collection_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final cart = CartService();
  final TextEditingController _promoController = TextEditingController();
  bool _applyingPromo = false;

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  void _handleApplyPromo() {
    final code = _promoController.text.trim();
    if (code.isEmpty) {
      LuxuryToast.showError(context, "Please enter a valid promo code.", title: "PROMO CODE");
      return;
    }

    setState(() => _applyingPromo = true);
    final success = cart.applyCoupon(code);
    setState(() => _applyingPromo = false);

    if (success) {
      LuxuryToast.showSuccess(
        context,
        "✨ Coupon '$code' applied successfully! Discount updated.",
        title: "COUPON APPLIED",
      );
    } else {
      LuxuryToast.showError(
        context,
        "Invalid coupon code. Try WELCOME10 or VRAJ100.",
        title: "INVALID COUPON",
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: cart,
      builder: (context, _) {
        final totalItems = cart.itemCount;

        return Scaffold(
          backgroundColor: const Color(0xFF09090B),
          appBar: AppBar(
            backgroundColor: const Color(0xFF0F0F12),
            elevation: 0,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFFFBBF24), size: 18),
              onPressed: () => Navigator.pop(context),
            ),
            title: const Text(
              "SHOPPING BAG",
              style: TextStyle(
                color: Color(0xFFFBBF24),
                fontSize: 16,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
              ),
            ),
            centerTitle: true,
            actions: [
              if (cart.items.isNotEmpty)
                IconButton(
                  icon: const Icon(Icons.delete_sweep_outlined, color: Colors.white60, size: 22),
                  tooltip: "Clear Bag",
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (dCtx) => AlertDialog(
                        backgroundColor: const Color(0xFF18181B),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                          side: const BorderSide(color: Color(0xFF27272A)),
                        ),
                        title: const Text(
                          "Clear Shopping Bag?",
                          style: TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        content: const Text(
                          "Are you sure you want to remove all items from your bag?",
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(dCtx),
                            child: const Text("CANCEL", style: TextStyle(color: Colors.white54)),
                          ),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFDC2626),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: () {
                              cart.clearCart();
                              Navigator.pop(dCtx);
                              LuxuryToast.showInfo(context, "Shopping bag cleared.", title: "BAG CLEARED");
                            },
                            child: const Text("CLEAR ALL", style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    );
                  },
                ),
            ],
          ),
          body: RefreshIndicator(
            color: const Color(0xFFF59E0B),
            backgroundColor: const Color(0xFF18181B),
            onRefresh: () async {
              await Future.delayed(const Duration(milliseconds: 300));
              if (mounted) setState(() {});
            },
            child: cart.items.isEmpty
                ? _buildEmptyState()
                : SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header with Item Count Badge
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Text(
                                      "SHOPPING",
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 20,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 1.2,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    const Text(
                                      "BAG",
                                      style: TextStyle(
                                        color: Color(0xFFFBBF24),
                                        fontSize: 20,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 1.2,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      width: 28,
                                      height: 2,
                                      color: const Color(0xFFF59E0B),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  "Review your bespoke apparel before proceeding to checkout.",
                                  style: TextStyle(color: Colors.white54, fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.shopping_bag_outlined, color: Color(0xFFFBBF24), size: 14),
                                const SizedBox(width: 5),
                                Text(
                                  "$totalItems ${totalItems == 1 ? 'Item' : 'Items'}",
                                  style: const TextStyle(
                                    color: Color(0xFFFBBF24),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Cart Items List
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: cart.items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 14),
                        itemBuilder: (ctx, index) {
                          final item = cart.items[index];
                          return _buildCartItemCard(item);
                        },
                      ),
                      const SizedBox(height: 24),

                      // Promo Code Card
                      _buildPromoCodeCard(),
                      const SizedBox(height: 20),

                      // Order Summary Card (CartTotal)
                      _buildCartTotalCard(),
                      const SizedBox(height: 20),

                      // Proceed to Checkout CTA
                      _buildCheckoutCTA(),
                      const SizedBox(height: 16),

                      // Trust Guarantees
                      _buildTrustGuarantees(),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        SizedBox(height: MediaQuery.of(context).size.height * 0.15),
        Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                    border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3), width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.shopping_bag_outlined, color: Color(0xFFFBBF24), size: 44),
                ),
                const SizedBox(height: 24),
                const Text(
                  "YOUR SHOPPING BAG IS EMPTY",
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Looks like you haven't added any luxury pieces yet. Explore our curated collections to discover exceptional designs.",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white54, fontSize: 12, height: 1.4),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 4,
                  ),
                  onPressed: () {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(builder: (_) => const CollectionScreen()),
                    );
                  },
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        "EXPLORE COLLECTION",
                        style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1, fontSize: 12),
                      ),
                      SizedBox(width: 8),
                      Icon(Icons.arrow_forward_rounded, size: 16),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCartItemCard(dynamic item) {
    final imgUrl = item.product.images.isNotEmpty ? item.product.images.first : item.product.image;
    final itemTotal = item.totalPrice;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF121216),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFF27272A)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Product Image
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  width: 76,
                  height: 76,
                  color: const Color(0xFF18181B),
                  child: imgUrl.isNotEmpty
                      ? ImageOptimizer.cachedImage(
                          imageUrl: imgUrl,
                          fit: BoxFit.cover,
                          width: 76,
                          height: 76,
                        )
                      : const Icon(Icons.image_outlined, color: Colors.white24),
                ),
              ),
              const SizedBox(width: 12),

              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.product.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        height: 1.2,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        if (item.product.category.isNotEmpty) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFF27272A),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              item.product.category.toUpperCase(),
                              style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: 6),
                        ],
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            "Size: ${item.size}",
                            style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.w900),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "Price: ₹${item.product.price.toStringAsFixed(0)}",
                      style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),

              // Delete Button
              IconButton(
                icon: const Icon(Icons.delete_outline_rounded, color: Colors.white38, size: 20),
                hoverColor: const Color(0xFFDC2626).withValues(alpha: 0.1),
                splashRadius: 18,
                onPressed: () {
                  cart.removeFromCart(item);
                  LuxuryToast.showInfo(context, "Item removed from bag.", title: "REMOVED");
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(color: Color(0xFF27272A), height: 1),
          const SizedBox(height: 12),

          // Stepper + Total row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Stepper buttons
              Container(
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: const Color(0xFF18181B),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF27272A)),
                ),
                child: Row(
                  children: [
                    _buildStepperBtn(
                      icon: Icons.remove,
                      onTap: () => cart.updateQuantity(item, -1),
                    ),
                    SizedBox(
                      width: 32,
                      child: Text(
                        "${item.quantity}",
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Color(0xFFFBBF24),
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                          fontSize: 13,
                        ),
                      ),
                    ),
                    _buildStepperBtn(
                      icon: Icons.add,
                      onTap: () => cart.updateQuantity(item, 1),
                    ),
                  ],
                ),
              ),

              // Total for item
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text("Item Total", style: TextStyle(color: Colors.white54, fontSize: 11.5)),
                  Text(
                    "₹${itemTotal.toStringAsFixed(0)}.00",
                    style: const TextStyle(
                      color: Color(0xFFFBBF24),
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStepperBtn({required IconData icon, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          color: const Color(0xFF27272A),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(icon, size: 14, color: Colors.white),
      ),
    );
  }

  Widget _buildPromoCodeCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF121216),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF27272A)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.local_offer_outlined, color: Color(0xFFF59E0B), size: 16),
              SizedBox(width: 6),
              Text(
                "HAVE A PROMO CODE?",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _promoController,
                  textCapitalization: TextCapitalization.characters,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'monospace',
                    letterSpacing: 1,
                  ),
                  decoration: InputDecoration(
                    hintText: "Enter code (e.g. WELCOME10)",
                    hintStyle: const TextStyle(color: Colors.white30, fontSize: 11),
                    filled: true,
                    fillColor: const Color(0xFF18181B),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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
                      borderSide: const BorderSide(color: Color(0xFFF59E0B), width: 1.5),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF27272A),
                  foregroundColor: const Color(0xFFFBBF24),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                onPressed: _applyingPromo ? null : _handleApplyPromo,
                child: _applyingPromo
                    ? const GoldenSweepLoader(size: 14)
                    : const Text(
                        "APPLY",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                      ),
              ),
            ],
          ),
          if (cart.hasCoupon) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 14),
                    const SizedBox(width: 6),
                    Text(
                      "Coupon '${cart.appliedCoupon}' applied (-₹${cart.discountAmount.toStringAsFixed(0)})",
                      style: const TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                InkWell(
                  onTap: () {
                    cart.removeCoupon();
                    _promoController.clear();
                  },
                  child: const Text(
                    "Remove",
                    style: TextStyle(color: Color(0xFFDC2626), fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCartTotalCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF121216),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF27272A)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Text(
                    "ORDER",
                    style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1),
                  ),
                  SizedBox(width: 4),
                  Text(
                    "SUMMARY",
                    style: TextStyle(color: Color(0xFFFBBF24), fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                ),
                child: const Text(
                  "VRAJ CHECKOUT",
                  style: TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                ),
              ),
            ],
          ),
          const Divider(color: Color(0xFF27272A), height: 20),

          // Rows
          _buildSummaryRow("Subtotal", "₹${cart.subtotal.toStringAsFixed(0)}.00"),
          const SizedBox(height: 8),
          _buildSummaryRow(
            "Shipping & Handling",
            cart.deliveryFee == 0 ? "FREE" : "₹${cart.deliveryFee.toStringAsFixed(0)}.00",
            isHighlight: cart.deliveryFee == 0,
          ),
          if (cart.discountAmount > 0) ...[
            const SizedBox(height: 8),
            _buildSummaryRow(
              "Coupon Discount",
              "-₹${cart.discountAmount.toStringAsFixed(0)}.00",
              isDiscount: true,
            ),
          ],
          const Divider(color: Color(0xFF27272A), height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Grand Total",
                style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
              ),
              Text(
                "₹${cart.grandTotal.toStringAsFixed(0)}.00",
                style: const TextStyle(
                  color: Color(0xFFFBBF24),
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isHighlight = false, bool isDiscount = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Colors.white60, fontSize: 12)),
        Text(
          value,
          style: TextStyle(
            color: isDiscount
                ? const Color(0xFF10B981)
                : isHighlight
                    ? const Color(0xFF10B981)
                    : Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.bold,
            fontFamily: 'monospace',
          ),
        ),
      ],
    );
  }

  Widget _buildCheckoutCTA() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFF59E0B),
          foregroundColor: Colors.black,
          padding: const EdgeInsets.symmetric(vertical: 18),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 6,
          shadowColor: const Color(0xFFF59E0B).withValues(alpha: 0.4),
        ),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const PlaceOrderScreen()),
          );
        },
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              "PROCEED TO CHECKOUT",
              style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.2, fontSize: 14),
            ),
            SizedBox(width: 8),
            Icon(Icons.arrow_forward_rounded, size: 18),
          ],
        ),
      ),
    );
  }

  Widget _buildTrustGuarantees() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF121216),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF27272A)),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _TrustItem(icon: Icons.lock_outline, label: "256-Bit SSL"),
          _VerticalDivider(),
          _TrustItem(icon: Icons.local_shipping_outlined, label: "Fast Dispatch"),
          _VerticalDivider(),
          _TrustItem(icon: Icons.verified_outlined, label: "Buyer Protected"),
        ],
      ),
    );
  }
}

class _TrustItem extends StatelessWidget {
  final IconData icon;
  final String label;
  const _TrustItem({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: const Color(0xFFF59E0B), size: 16),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(color: Colors.white54, fontSize: 11, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _VerticalDivider extends StatelessWidget {
  const _VerticalDivider();

  @override
  Widget build(BuildContext context) {
    return Container(height: 16, width: 1, color: const Color(0xFF27272A));
  }
}

