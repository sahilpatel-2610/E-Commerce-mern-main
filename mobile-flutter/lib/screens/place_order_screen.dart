import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/cart_service.dart';
import '../services/firebase_service.dart';
import '../utils/luxury_toast.dart';
import '../utils/image_optimizer.dart';
import '../widgets/luxury_loader.dart';
import 'orders_screen.dart';

class PlaceOrderScreen extends StatefulWidget {
  const PlaceOrderScreen({super.key});

  @override
  State<PlaceOrderScreen> createState() => _PlaceOrderScreenState();
}

class _PlaceOrderScreenState extends State<PlaceOrderScreen> {
  final cart = CartService();
  final _formKey = GlobalKey<FormState>();

  // Delivery Address Controllers
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _streetController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _pincodeController = TextEditingController();
  final _countryController = TextEditingController(text: "India");
  final _phoneController = TextEditingController();

  String _paymentMethod = "cod"; // "cod", "stripe", "upi"
  bool _submitting = false;
  String _userEmail = "";
  String _userId = "";

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _streetController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pincodeController.dispose();
    _countryController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _loadUserProfile() async {
    final sp = await SharedPreferences.getInstance();
    final email = sp.getString('userEmail') ?? "";
    final name = sp.getString('userName') ?? "";
    final phone = sp.getString('userPhone') ?? "";
    final address = sp.getString('userAddress') ?? "";
    final city = sp.getString('userCity') ?? "";
    final state = sp.getString('userState') ?? "";
    final pincode = sp.getString('userPincode') ?? "";

    if (mounted) {
      setState(() {
        _userEmail = email;
        _userId = sp.getString('userId') ?? "";
        if (name.isNotEmpty) {
          final parts = name.split(' ');
          _firstNameController.text = parts.first;
          if (parts.length > 1) {
            _lastNameController.text = parts.sublist(1).join(' ');
          }
        }
        if (email.isNotEmpty) _emailController.text = email;
        if (phone.isNotEmpty) _phoneController.text = phone;
        if (address.isNotEmpty) _streetController.text = address;
        if (city.isNotEmpty) _cityController.text = city;
        if (state.isNotEmpty) _stateController.text = state;
        if (pincode.isNotEmpty) _pincodeController.text = pincode;
      });
    }

    if (email.isNotEmpty) {
      try {
        final liveProfile = await FirebaseService.getUserProfile(email);
        if (liveProfile != null && mounted) {
          setState(() {
            final liveName = liveProfile['name']?.toString() ?? name;
            final livePhone = liveProfile['phone']?.toString() ?? liveProfile['phoneNumber']?.toString() ?? phone;
            final parts = liveName.split(' ');
            if (_firstNameController.text.isEmpty) _firstNameController.text = parts.first;
            if (_lastNameController.text.isEmpty && parts.length > 1) {
              _lastNameController.text = parts.sublist(1).join(' ');
            }
            if (_phoneController.text.isEmpty) _phoneController.text = livePhone;
          });
        }
      } catch (_) {}
    }
  }

  Future<void> _saveAddressForFuture() async {
    final sp = await SharedPreferences.getInstance();
    await sp.setString('userAddress', _streetController.text.trim());
    await sp.setString('userCity', _cityController.text.trim());
    await sp.setString('userState', _stateController.text.trim());
    await sp.setString('userPincode', _pincodeController.text.trim());
    await sp.setString('userPhone', _phoneController.text.trim());
  }

  Future<void> _submitOrder() async {
    if (!_formKey.currentState!.validate()) {
      LuxuryToast.showError(
        context,
        "Please complete all required delivery fields.",
        title: "INCOMPLETE ADDRESS",
      );
      return;
    }

    if (cart.items.isEmpty) {
      LuxuryToast.showError(
        context,
        "Your shopping bag is empty.",
        title: "EMPTY BAG",
      );
      Navigator.pop(context);
      return;
    }

    setState(() => _submitting = true);
    await _saveAddressForFuture();

    try {
      final List<Map<String, dynamic>> orderItems = cart.items.map((item) {
        final imgUrl = item.product.images.isNotEmpty ? item.product.images.first : item.product.image;
        return {
          '_id': item.product.id,
          'id': item.product.id,
          'name': item.product.name,
          'title': item.product.name,
          'price': item.product.price,
          'size': item.size,
          'quantity': item.quantity,
          'category': item.product.category,
          'image': imgUrl,
          'images': [imgUrl],
        };
      }).toList();

      final fullName = "${_firstNameController.text.trim()} ${_lastNameController.text.trim()}".trim();
      final dynamicCustName = fullName.isNotEmpty ? fullName : (_emailController.text.trim().isNotEmpty ? _emailController.text.trim() : "Customer");

      final addressMap = {
        'firstName': _firstNameController.text.trim(),
        'lastName': _lastNameController.text.trim(),
        'fullName': dynamicCustName,
        'name': dynamicCustName,
        'email': _emailController.text.trim(),
        'street': _streetController.text.trim(),
        'city': _cityController.text.trim(),
        'state': _stateController.text.trim(),
        'pincode': _pincodeController.text.trim(),
        'country': _countryController.text.trim().isNotEmpty ? _countryController.text.trim() : "India",
        'phone': _phoneController.text.trim(),
      };

      final orderDocId = "ord_${DateTime.now().millisecondsSinceEpoch}";
      final orderPayload = {
        '_id': orderDocId,
        'userId': _userId.isNotEmpty ? _userId : _emailController.text.trim(),
        'userEmail': _emailController.text.trim().isNotEmpty ? _emailController.text.trim() : _userEmail,
        'customerName': dynamicCustName,
        'name': dynamicCustName,
        'firstName': _firstNameController.text.trim(),
        'lastName': _lastNameController.text.trim(),
        'fullName': dynamicCustName,
        'phone': _phoneController.text.trim(),
        'address': addressMap,
        'items': orderItems,
        'amount': cart.grandTotal,
        'subtotal': cart.subtotal,
        'deliveryFee': cart.deliveryFee,
        'discount': cart.discountAmount,
        'coupon': cart.appliedCoupon,
        'itemsCount': cart.itemCount,
        'paymentMethod': _paymentMethod.toUpperCase(),
        'payment': _paymentMethod != "cod",
        'paymentStatus': _paymentMethod == "cod" ? "Pending" : "Completed",
        'status': "Order Placed",
        'platform': "Mobile Flutter",
        'source': "Mobile Flutter",
        'date': DateTime.now().millisecondsSinceEpoch,
        'createdAt': DateTime.now().toIso8601String(),
      };

      final result = await FirebaseService.createOrder(orderPayload);

      if (mounted) {
        setState(() => _submitting = false);
        if (result['success'] == true) {
          final placedOrderId = result['orderId']?.toString() ?? orderDocId;
          cart.clearCart();
          _showOrderSuccessDialog(placedOrderId);
        } else {
          LuxuryToast.showError(
            context,
            result['message']?.toString() ?? "Failed to place order in Firebase.",
            title: "ORDER FAILED",
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        LuxuryToast.showError(
          context,
          "An unexpected error occurred: $e",
          title: "ORDER ERROR",
        );
      }
    }
  }

  void _showOrderSuccessDialog(String orderId) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dCtx) => Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        backgroundColor: const Color(0xFF121216),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(28),
          side: const BorderSide(color: Color(0xFFF59E0B), width: 1.5),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  border: Border.all(color: const Color(0xFF10B981), width: 2),
                ),
                child: const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 40),
              ),
              const SizedBox(height: 16),
              const Text(
                "ORDER CONFIRMED!",
                style: TextStyle(
                  color: Color(0xFFFBBF24),
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "Thank you for placing your bespoke order with Vraj Creation. Your order has been recorded in Firebase Firestore!",
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.4),
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF18181B),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF27272A)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.receipt_long, color: Color(0xFFF59E0B), size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        "Order ID: $orderId",
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white70,
                        side: const BorderSide(color: Color(0xFF3F3F46)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: () {
                        Navigator.pop(dCtx);
                        Navigator.pop(context);
                      },
                      child: const Text(
                        "SHOP MORE",
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF59E0B),
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 4,
                      ),
                      onPressed: () {
                        Navigator.pop(dCtx);
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(builder: (_) => const OrdersScreen()),
                        );
                      },
                      child: const Text(
                        "VIEW ORDERS",
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
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
          "SECURE CHECKOUT",
          style: TextStyle(
            color: Color(0xFFFBBF24),
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
          ),
        ),
        centerTitle: true,
      ),
      body: AnimatedBuilder(
        animation: cart,
        builder: (context, _) {
          return SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Subtitle Banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF14141A),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF27272A)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                          ),
                          child: const Icon(Icons.lock_outline, color: Color(0xFFF59E0B), size: 18),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Text(
                            "Complete your delivery details to finalize your bespoke fashion order.",
                            style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.3),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 1. DELIVERY ADDRESS FORM
                  _buildSectionTitle("1. DELIVERY ADDRESS", Icons.location_on_outlined),
                  const SizedBox(height: 12),
                  _buildAddressFormCard(),

                  const SizedBox(height: 24),

                  // 2. ORDER SUMMARY PREVIEW
                  _buildSectionTitle("2. ORDER SUMMARY", Icons.receipt_long_outlined),
                  const SizedBox(height: 12),
                  _buildOrderSummaryCard(),

                  const SizedBox(height: 24),

                  // 3. PAYMENT METHOD SELECTOR
                  _buildSectionTitle("3. SELECT PAYMENT METHOD", Icons.payment_outlined),
                  const SizedBox(height: 12),
                  _buildPaymentMethodsCard(),

                  const SizedBox(height: 32),

                  // 4. PLACE ORDER CTA
                  _buildSubmitButton(),

                  const SizedBox(height: 16),
                  const Center(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.verified_user_outlined, color: Color(0xFF10B981), size: 14),
                        SizedBox(width: 6),
                        Text(
                          "Direct live sync with Firebase Firestore Atelier",
                          style: TextStyle(color: Colors.white54, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: const Color(0xFFF59E0B), size: 18),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            color: Color(0xFFFBBF24),
            fontSize: 14,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
          ),
        ),
      ],
    );
  }

  Widget _buildAddressFormCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF121216),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF27272A)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildTextField(
                  controller: _firstNameController,
                  label: "First Name *",
                  hint: "Rahul",
                  icon: Icons.person_outline,
                  validator: (v) => v == null || v.trim().isEmpty ? "Required" : null,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildTextField(
                  controller: _lastNameController,
                  label: "Last Name *",
                  hint: "Patel",
                  icon: Icons.person_outline,
                  validator: (v) => v == null || v.trim().isEmpty ? "Required" : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _buildTextField(
            controller: _emailController,
            label: "Email Address *",
            hint: "rahul.patel@gmail.com",
            icon: Icons.email_outlined,
            keyboardType: TextInputType.emailAddress,
            validator: (v) {
              if (v == null || v.trim().isEmpty) return "Email is required";
              if (!v.contains('@') || !v.contains('.')) return "Enter valid email";
              return null;
            },
          ),
          const SizedBox(height: 14),
          _buildTextField(
            controller: _streetController,
            label: "Street / Shop / Building Address *",
            hint: "Flat 402, Royal Residency, Ring Road",
            icon: Icons.home_work_outlined,
            validator: (v) => v == null || v.trim().isEmpty ? "Address is required" : null,
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _buildTextField(
                  controller: _cityController,
                  label: "City *",
                  hint: "Surat",
                  icon: Icons.location_city_outlined,
                  validator: (v) => v == null || v.trim().isEmpty ? "Required" : null,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildTextField(
                  controller: _stateController,
                  label: "State *",
                  hint: "Gujarat",
                  icon: Icons.map_outlined,
                  validator: (v) => v == null || v.trim().isEmpty ? "Required" : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _buildTextField(
                  controller: _pincodeController,
                  label: "PIN Code *",
                  hint: "395003",
                  icon: Icons.pin_drop_outlined,
                  keyboardType: TextInputType.number,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return "Required";
                    if (v.trim().length < 6) return "6 digits";
                    return null;
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildTextField(
                  controller: _countryController,
                  label: "Country",
                  hint: "India",
                  icon: Icons.public_outlined,
                  validator: (v) => v == null || v.trim().isEmpty ? "Required" : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _buildTextField(
            controller: _phoneController,
            label: "Mobile Phone Number *",
            hint: "9876543210",
            icon: Icons.phone_outlined,
            keyboardType: TextInputType.phone,
            validator: (v) {
              if (v == null || v.trim().isEmpty) return "Phone number is required";
              if (v.trim().length < 10) return "At least 10 digits";
              return null;
            },
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
          validator: validator,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: Colors.white30, fontSize: 12),
            prefixIcon: Icon(icon, color: const Color(0xFFF59E0B), size: 18),
            filled: true,
            fillColor: const Color(0xFF18181B),
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
              borderSide: const BorderSide(color: Color(0xFFF59E0B), width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFDC2626)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOrderSummaryCard() {
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
          // Items Preview List
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: cart.items.length,
            separatorBuilder: (_, __) => const Divider(color: Color(0xFF27272A), height: 16),
            itemBuilder: (ctx, idx) {
              final item = cart.items[idx];
              final imgUrl = item.product.images.isNotEmpty ? item.product.images.first : item.product.image;
              return Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: SizedBox(
                      width: 44,
                      height: 44,
                      child: imgUrl.isNotEmpty
                          ? ImageOptimizer.cachedImage(imageUrl: imgUrl, fit: BoxFit.cover)
                          : Container(color: const Color(0xFF27272A)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.product.name,
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                              ),
                              child: Text(
                                "Size: ${item.size}",
                                style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 11.5, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              "Qty: ${item.quantity}",
                              style: const TextStyle(color: Colors.white70, fontSize: 12.5, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Text(
                    "₹${item.totalPrice.toStringAsFixed(0)}",
                    style: const TextStyle(
                      color: Color(0xFFFBBF24),
                      fontWeight: FontWeight.bold,
                      fontFamily: 'monospace',
                      fontSize: 13,
                    ),
                  ),
                ],
              );
            },
          ),
          const Divider(color: Color(0xFF27272A), height: 24),

          // Price Breakdown
          _buildSummaryRow("Subtotal", "₹${cart.subtotal.toStringAsFixed(0)}"),
          const SizedBox(height: 8),
          _buildSummaryRow(
            "Shipping & Handling",
            cart.deliveryFee == 0 ? "FREE" : "₹${cart.deliveryFee.toStringAsFixed(0)}",
            isHighlight: cart.deliveryFee == 0,
          ),
          if (cart.discountAmount > 0) ...[
            const SizedBox(height: 8),
            _buildSummaryRow(
              "Coupon (${cart.appliedCoupon})",
              "-₹${cart.discountAmount.toStringAsFixed(0)}",
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

  Widget _buildPaymentMethodsCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF121216),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF27272A)),
      ),
      child: Column(
        children: [
          // 1. COD
          _buildPaymentOption(
            id: "cod",
            title: "Cash on Delivery (COD)",
            subtitle: "Pay in cash when parcel is delivered to your door",
            badge: "POPULAR",
            icon: Icons.payments_outlined,
          ),
          const SizedBox(height: 12),

          // 2. Stripe / Card
          _buildPaymentOption(
            id: "stripe",
            title: "Credit / Debit Card (Stripe)",
            subtitle: "Visa, Mastercard, RuPay & American Express",
            icon: Icons.credit_card_outlined,
          ),
          const SizedBox(height: 12),

          // 3. UPI / NetBanking
          _buildPaymentOption(
            id: "upi",
            title: "UPI / QR Code & NetBanking",
            subtitle: "Google Pay, PhonePe, Paytm & NetBanking",
            icon: Icons.qr_code_scanner_outlined,
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentOption({
    required String id,
    required String title,
    required String subtitle,
    required IconData icon,
    String? badge,
  }) {
    final isSelected = _paymentMethod == id;
    return InkWell(
      onTap: () => setState(() => _paymentMethod = id),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF59E0B).withValues(alpha: 0.1) : const Color(0xFF18181B),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? const Color(0xFFF59E0B) : const Color(0xFF27272A),
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? const Color(0xFFF59E0B) : Colors.white38,
                  width: 2,
                ),
                color: isSelected ? const Color(0xFFF59E0B) : Colors.transparent,
              ),
              child: isSelected
                  ? const Center(
                      child: Icon(Icons.check, size: 12, color: Colors.black),
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            Icon(icon, color: isSelected ? const Color(0xFFF59E0B) : Colors.white54, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          title,
                          style: TextStyle(
                            color: isSelected ? Colors.white : Colors.white70,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (badge != null) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFF59E0B)),
                          ),
                          child: Text(
                            badge,
                            style: const TextStyle(
                              color: Color(0xFFFBBF24),
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: const TextStyle(color: Colors.white60, fontSize: 12.5),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSubmitButton() {
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
        onPressed: _submitting ? null : _submitOrder,
        child: _submitting
            ? const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  GoldenSweepLoader(size: 18),
                  SizedBox(width: 12),
                  Text(
                    "PROCESSING ORDER...",
                    style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.2, fontSize: 14),
                  ),
                ],
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.lock_rounded, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    "PLACE ORDER (₹${cart.grandTotal.toStringAsFixed(0)})",
                    style: const TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.2, fontSize: 14),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.arrow_forward_rounded, size: 18),
                ],
              ),
      ),
    );
  }
}
