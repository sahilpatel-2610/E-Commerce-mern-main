import 'package:flutter/material.dart';

class BrandLogo extends StatelessWidget {
  final double height;
  final double? width;
  const BrandLogo({super.key, this.height = 54, this.width});

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/logo.png',
      height: height,
      width: width,
      fit: BoxFit.contain,
      errorBuilder: (context, error, stackTrace) {
        return Image.asset(
          'assets/logo_brand.png',
          height: height,
          width: width,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => Container(
            height: height,
            width: width ?? height,
            color: Colors.black,
            child: const Icon(Icons.diamond_outlined, color: Color(0xFFFBBF24), size: 28),
          ),
        );
      },
    );
  }
}
