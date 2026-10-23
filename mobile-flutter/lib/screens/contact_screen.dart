import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../services/firebase_service.dart';
import '../utils/image_optimizer.dart';
import '../widgets/luxury_loader.dart';

class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  Map<String, dynamic>? _contact;
  bool _loading = true;
  VideoPlayerController? _videoController;

  @override
  void initState() {
    super.initState();
    _fetchContact();
  }

  @override
  void dispose() {
    _videoController?.dispose();
    super.dispose();
  }

  Future<void> _fetchContact() async {
    final info = await FirebaseService.getContactInfo();
    if (mounted) {
      setState(() {
        _contact = info;
        _loading = false;
      });
      _initShowroomMedia();
    }
  }

  void _initShowroomMedia() {
    final mediaSrc = (_contact?['image'] ?? _contact?['imageUrl'] ?? '').toString().trim();
    if (mediaSrc.isEmpty) return;

    final isVideo = mediaSrc.endsWith('.mp4') || mediaSrc.endsWith('.webm') || mediaSrc.contains('/video/upload/');

    if (isVideo) {
      if (mediaSrc.startsWith('http://') || mediaSrc.startsWith('https://')) {
        final opt = ImageOptimizer.optimizeVideoUrl(mediaSrc);
        final uri = Uri.tryParse(opt);
        if (uri != null) {
          _videoController = VideoPlayerController.networkUrl(
            uri,
            videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
          )
            ..setLooping(true)
            ..setVolume(0.0)
            ..initialize().then((_) {
              if (mounted) {
                setState(() {});
                _videoController?.play();
              }
            });
        }
      } else {
        final cleanName = mediaSrc.replaceAll('/', '').trim();
        _videoController = VideoPlayerController.asset(
          "assets/videos/$cleanName",
          videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
        )
          ..setLooping(true)
          ..setVolume(0.0)
          ..initialize().then((_) {
            if (mounted) {
              setState(() {});
              _videoController?.play();
            }
          });
      }
    }
  }

  Widget _buildContactCard({
    required IconData icon,
    required String title,
    required String subtitle,
    bool isMonospace = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF0F0F12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF27272A)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B).withOpacity(0.12),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.3)),
            ),
            child: Icon(icon, color: const Color(0xFFFBBF24), size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: isMonospace ? const Color(0xFFFBBF24) : const Color(0xFF9CA3AF),
                    fontSize: 13,
                    fontFamily: isMonospace ? 'monospace' : null,
                    fontWeight: isMonospace ? FontWeight.bold : FontWeight.normal,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mediaSrc = (_contact?['image'] ?? _contact?['imageUrl'] ?? _contact?['src'] ?? '').toString().trim();
    final isVideo = mediaSrc.endsWith('.mp4') || mediaSrc.endsWith('.webm') || mediaSrc.contains('/video/upload/');
    final showroomCity = (_contact?['showroomCity'] ?? 'Surat').toString();

    return Scaffold(
      backgroundColor: const Color(0xFF050505),
      appBar: AppBar(
        backgroundColor: const Color(0xFF09090B),
        elevation: 0,
        scrolledUnderElevation: 0,
        automaticallyImplyLeading: false,
        title: const Text(
          "CONTACT US",
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
              _fetchContact();
            },
            tooltip: "Refresh Contact Info",
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: _loading
          ? const Center(child: GoldenSweepLoader(size: 50))
          : RefreshIndicator(
              color: const Color(0xFFF59E0B),
              backgroundColor: const Color(0xFF18181B),
              onRefresh: _fetchContact,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                child: Column(
                  children: [
                  // Title Section
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        "CONTACT ",
                        style: TextStyle(
                          color: Color(0xFFF59E0B),
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const Text(
                        "US",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(height: 2, width: 30, color: const Color(0xFFF59E0B)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    "We'd love to connect with you. Reach out for wholesale inquiries, custom orders, or customer support.",
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12.5, height: 1.4),
                  ),
                  const SizedBox(height: 24),

                  // Store Location Card
                  _buildContactCard(
                    icon: Icons.location_on_outlined,
                    title: _contact?['officeTitle'] ?? "Office & Showroom",
                    subtitle: _contact?['officeAddress'] ??
                        "Vraj Creation Flagship Studio, Ring Road Textile Market, Surat, Gujarat 395002",
                  ),
                  const SizedBox(height: 14),

                  // Phone Card
                  _buildContactCard(
                    icon: Icons.phone_outlined,
                    title: "Wholesale Inquiries",
                    subtitle: _contact?['phone'] ?? "+91 98765 43210",
                    isMonospace: true,
                  ),
                  const SizedBox(height: 14),

                  // Email Card
                  _buildContactCard(
                    icon: Icons.email_outlined,
                    title: "Email Support",
                    subtitle: _contact?['email'] ?? "concierge@vrajcreation.com",
                  ),
                  const SizedBox(height: 24),

                  // Careers Section
                  if (_contact?['careersTitle'] != null) ...[
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F0F12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF27272A)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.work_outline, color: Color(0xFFFBBF24), size: 20),
                              const SizedBox(width: 10),
                              Text(
                                _contact!['careersTitle'],
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _contact?['careersDesc'] ?? "Explore master tailoring and luxury craftsmanship careers.",
                            style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13, height: 1.45),
                          ),
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFFF59E0B), Color(0xFFEAB308)],
                              ),
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFFF59E0B).withOpacity(0.25),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Text(
                              _contact?['careersBtnText'] ?? "EXPLORE OPENINGS",
                              style: const TextStyle(
                                color: Colors.black,
                                fontWeight: FontWeight.w900,
                                fontSize: 11.5,
                                letterSpacing: 1.2,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Showroom Live Video / Image Banner (Enlarged, Prominent & Ultra-Luxury)
                  if (mediaSrc.isNotEmpty) ...[
                    Container(
                      height: 480,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.6),
                          width: 1.8,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                            blurRadius: 24,
                            spreadRadius: 2,
                            offset: const Offset(0, 8),
                          ),
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.8),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(26),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            if (isVideo && _videoController != null && _videoController!.value.isInitialized)
                              FittedBox(
                                fit: BoxFit.cover,
                                child: SizedBox(
                                  width: _videoController!.value.size.width,
                                  height: _videoController!.value.size.height,
                                  child: VideoPlayer(_videoController!),
                                ),
                              )
                            else
                              ImageOptimizer.cachedImage(
                                imageUrl: mediaSrc,
                                fit: BoxFit.cover,
                                memCacheWidth: 1080,
                                memCacheHeight: 1600,
                              ),
                            Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    Colors.black.withValues(alpha: 0.92),
                                    Colors.black.withValues(alpha: 0.2),
                                    Colors.transparent,
                                    Colors.black.withValues(alpha: 0.5),
                                  ],
                                  stops: const [0.0, 0.35, 0.65, 1.0],
                                  begin: Alignment.bottomCenter,
                                  end: Alignment.topCenter,
                                ),
                              ),
                            ),

                            // Top Header Tag
                            Positioned(
                              top: 16,
                              left: 16,
                              right: 16,
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: Colors.black.withValues(alpha: 0.75),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.6)),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.storefront_rounded, color: Color(0xFFFBBF24), size: 14),
                                        SizedBox(width: 6),
                                        Text(
                                          "FLAGSHIP ATELIER",
                                          style: TextStyle(
                                            color: Color(0xFFFBBF24),
                                            fontSize: 10.5,
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 1.2,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
                                    ),
                                    child: Text(
                                      showroomCity.toUpperCase(),
                                      style: const TextStyle(
                                        color: Color(0xFFFBBF24),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 1,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Bottom Info Overlay
                            Positioned(
                              bottom: 20,
                              left: 20,
                              right: 20,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.8),
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(color: const Color(0xFF27272A)),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.5),
                                      blurRadius: 10,
                                    ),
                                  ],
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            "Vraj Creation — Men's Apparel",
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w900,
                                              fontSize: 13.5,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          SizedBox(height: 2),
                                          Text(
                                            "Bespoke Showroom & Experience Center",
                                            style: TextStyle(
                                              color: Color(0xFF9CA3AF),
                                              fontSize: 11,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                                        shape: BoxShape.circle,
                                        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                                      ),
                                      child: const Icon(Icons.location_city_rounded, color: Color(0xFFFBBF24), size: 16),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
    );
  }
}
