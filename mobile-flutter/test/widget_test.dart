import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vraj_creation_mobile/main.dart';
import 'package:vraj_creation_mobile/models/product_model.dart';

void main() {
  group('Vraj Creation Automated Test Suite', () {
    test('Product JSON parser handles Firestore dynamic data structure', () {
      final firestoreSample = {
        '_id': 'prod_live_001',
        'name': 'Bespoke Silk Sherwani',
        'price': 12500,
        'oldPrice': 15000,
        'category': 'Sherwani',
        'images': ['https://res.cloudinary.com/test/image.jpg'],
        'sizes': ['M', 'L', 'XL', 'XXL'],
        'bestseller': true,
        'rating': 4.9,
      };

      final product = Product.fromJson(firestoreSample);

      expect(product.id, 'prod_live_001');
      expect(product.name, 'Bespoke Silk Sherwani');
      expect(product.price, 12500.0);
      expect(product.bestseller, true);
      expect(product.sizes.length, 4);
    });

    testWidgets('App root initializes correctly', (WidgetTester tester) async {
      await tester.pumpWidget(const VrajCreationApp());
      expect(find.byType(MaterialApp), findsOneWidget);
    });
  });
}
