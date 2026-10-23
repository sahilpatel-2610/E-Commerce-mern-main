import 'package:flutter/material.dart';

class GoldenSweepLoader extends StatefulWidget {
  final double size;
  final double borderWidth;

  const GoldenSweepLoader({
    Key? key,
    this.size = 48,
    this.borderWidth = 2.5,
  }) : super(key: key);

  @override
  State<GoldenSweepLoader> createState() => _GoldenSweepLoaderState();
}

class _GoldenSweepLoaderState extends State<GoldenSweepLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: widget.size,
        height: widget.size,
        child: RotationTransition(
          turns: _controller,
          child: Container(
            width: widget.size,
            height: widget.size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: const Color(0xFFF59E0B).withOpacity(0.25),
                width: widget.borderWidth,
              ),
              gradient: const SweepGradient(
                colors: [
                  Color(0xFFF59E0B),
                  Color(0xFFFBBF24),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
