import 'product_model.dart';

class CartItem {
  final Product product;
  final String size;
  final String color;
  int quantity;

  CartItem({
    required this.product,
    this.size = "Standard",
    this.color = "",
    this.quantity = 1,
  });

  double get totalPrice => product.price * quantity;
}
