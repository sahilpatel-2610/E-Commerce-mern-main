import 'package:flutter/foundation.dart';
import '../models/cart_item_model.dart';
import '../models/product_model.dart';

class CartService extends ChangeNotifier {
  static final CartService _instance = CartService._internal();
  factory CartService() => _instance;
  static CartService get instance => _instance;
  CartService._internal();

  final List<CartItem> _items = [];
  String _appliedCoupon = "";
  double _discountPercentage = 0.0;
  double _fixedDiscount = 0.0;

  List<CartItem> get items => List.unmodifiable(_items);

  int get itemCount => _items.fold(0, (sum, item) => sum + item.quantity);

  double get subtotal => _items.fold(0.0, (sum, item) => sum + item.totalPrice);

  // Complimentary express shipping for orders above ₹5000, else ₹60 standard fee
  double get deliveryFee {
    if (_items.isEmpty) return 0.0;
    return subtotal >= 5000 ? 0.0 : 60.0;
  }

  String get appliedCoupon => _appliedCoupon;
  bool get hasCoupon => _appliedCoupon.isNotEmpty;

  double get discountAmount {
    if (_items.isEmpty) return 0.0;
    if (_discountPercentage > 0) {
      return (subtotal * _discountPercentage) / 100.0;
    }
    if (_fixedDiscount > 0) {
      return _fixedDiscount > subtotal ? subtotal : _fixedDiscount;
    }
    return 0.0;
  }

  double get grandTotal {
    if (_items.isEmpty) return 0.0;
    final total = subtotal + deliveryFee - discountAmount;
    return total < 0 ? 0.0 : total;
  }

  double get total => grandTotal;

  bool applyCoupon(String code) {
    final clean = code.trim().toUpperCase();
    if (clean.isEmpty) return false;

    if (clean == "WELCOME10" || clean == "VRAJ10") {
      _appliedCoupon = clean;
      _discountPercentage = 10.0;
      _fixedDiscount = 0.0;
      notifyListeners();
      return true;
    } else if (clean == "VRAJ100" || clean == "FIRST100") {
      _appliedCoupon = clean;
      _discountPercentage = 0.0;
      _fixedDiscount = 100.0;
      notifyListeners();
      return true;
    } else if (clean == "LUXURY20" || clean == "VIP20") {
      _appliedCoupon = clean;
      _discountPercentage = 20.0;
      _fixedDiscount = 0.0;
      notifyListeners();
      return true;
    } else if (clean == "FESTIVE500" || clean == "WEDDING500") {
      _appliedCoupon = clean;
      _discountPercentage = 0.0;
      _fixedDiscount = 500.0;
      notifyListeners();
      return true;
    }

    // Default 10% discount for any custom promo
    _appliedCoupon = clean;
    _discountPercentage = 10.0;
    _fixedDiscount = 0.0;
    notifyListeners();
    return true;
  }

  void removeCoupon() {
    _appliedCoupon = "";
    _discountPercentage = 0.0;
    _fixedDiscount = 0.0;
    notifyListeners();
  }

  void addToCart(Product product, {String size = "Standard", String color = ""}) {
    final existingIndex = _items.indexWhere(
      (item) => item.product.id == product.id && item.size == size && item.color == color,
    );

    if (existingIndex >= 0) {
      _items[existingIndex].quantity += 1;
    } else {
      _items.add(CartItem(product: product, size: size, color: color, quantity: 1));
    }
    notifyListeners();
  }

  void addItem(Product product, String? size) {
    addToCart(product, size: size ?? "Standard");
  }

  void updateQuantity(CartItem item, int delta) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      _items.remove(item);
    }
    notifyListeners();
  }

  void setQuantity(CartItem item, int qty) {
    if (qty <= 0) {
      _items.remove(item);
    } else {
      item.quantity = qty;
    }
    notifyListeners();
  }

  void removeFromCart(CartItem item) {
    _items.remove(item);
    notifyListeners();
  }

  void clearCart() {
    _items.clear();
    _appliedCoupon = "";
    _discountPercentage = 0.0;
    _fixedDiscount = 0.0;
    notifyListeners();
  }
}
