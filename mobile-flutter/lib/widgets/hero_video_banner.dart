import 'dart:async';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../models/banner_model.dart';
import '../utils/image_optimizer.dart';
import 'luxury_loader.dart';

class HeroBannerMedia extends StatefulWidget {
  final HomeBanner banner;
  final bool isCurrent;
  final VoidCallback? onVideoComplete;

  const HeroBannerMedia({
    super.key,
    required this.banner,
    this.isCurrent = true,
    this.onVideoComplete,
  });

  @override
  State<HeroBannerMedia> createState() => _HeroBannerMediaState();
}

class _HeroBannerMediaState extends State<HeroBannerMedia> {
  VideoPlayerController? _controller;
  bool _initialized = false;
  bool _hasError = false;
  bool _completedFired = false;
  Timer? _errorFallbackTimer;

  @override
  void initState() {
    super.initState();
    if (widget.isCurrent) {
      _initVideo();
    }
  }

  void _initVideo() {
    if (_controller != null) return;
    final media = widget.banner.mediaUrl.trim();
    if (media.isEmpty) return;

    final isVid = widget.banner.mediaType == 'video' ||
        media.endsWith('.mp4') ||
        media.endsWith('.webm') ||
        media.endsWith('.mov') ||
        media.contains('/video/upload/');

    if (isVid) {
      VideoPlayerController ctrl;

      if (media.startsWith('http://') || media.startsWith('https://')) {
        final optUrl = ImageOptimizer.optimizeVideoUrl(media);
        final uri = Uri.tryParse(optUrl);
        if (uri == null) return;
        ctrl = VideoPlayerController.networkUrl(
          uri,
          videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
        );
      } else {
        String cleanPath = media;
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
        if (cleanPath == 'Fashion-SaiAagaman.mp4' || cleanPath == 'Vraj_Saiaagaman.mp4') {
          cleanPath = 'Fashion_saiaagaman.mp4';
        }
        if (!cleanPath.startsWith('assets/')) {
          cleanPath = "assets/videos/$cleanPath";
        }
        ctrl = VideoPlayerController.asset(
          cleanPath,
          videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
        );
      }

      _controller = ctrl
        ..setVolume(0.0)
        ..setLooping(false)
        ..addListener(_videoListener)
        ..initialize().then((_) {
          if (mounted && widget.isCurrent) {
            setState(() {
              _initialized = true;
              _hasError = false;
            });
            _controller?.play();
          }
        }).catchError((err) {
          if (mounted) {
            setState(() {
              _hasError = true;
            });
          }
          _errorFallbackTimer = Timer(const Duration(seconds: 4), () {
            widget.onVideoComplete?.call();
          });
        });
    }
  }

  void _videoListener() {
    if (_controller != null && _initialized && widget.isCurrent) {
      final pos = _controller!.value.position;
      final dur = _controller!.value.duration;
      final isCompleted = _controller!.value.isCompleted;

      // Video finishes playing 100% full duration from start to end
      if (dur > Duration.zero && (isCompleted || pos >= dur - const Duration(milliseconds: 250))) {
        if (!_completedFired) {
          _completedFired = true;
          widget.onVideoComplete?.call();
        }
      }
    }
  }

  @override
  void didUpdateWidget(covariant HeroBannerMedia oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.banner.mediaUrl != widget.banner.mediaUrl) {
      _disposeController();
      if (widget.isCurrent) {
        _initVideo();
      }
    } else if (oldWidget.isCurrent != widget.isCurrent) {
      if (widget.isCurrent) {
        _completedFired = false;
        _initVideo();
      } else {
        _disposeController();
      }
    }
  }

  void _disposeController() {
    _errorFallbackTimer?.cancel();
    _controller?.removeListener(_videoListener);
    _controller?.pause();
    _controller?.dispose();
    _controller = null;
    _initialized = false;
    _hasError = false;
    _completedFired = false;
  }

  @override
  void dispose() {
    _disposeController();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final poster = widget.banner.posterUrl;

    if (_initialized && _controller != null && !_hasError) {
      return SizedBox.expand(
        child: FittedBox(
          fit: BoxFit.cover,
          clipBehavior: Clip.hardEdge,
          child: SizedBox(
            width: _controller!.value.size.width > 0 ? _controller!.value.size.width : 16,
            height: _controller!.value.size.height > 0 ? _controller!.value.size.height : 9,
            child: VideoPlayer(_controller!),
          ),
        ),
      );
    }

    // Instant high-res poster fallback while video connects
    if (poster.isNotEmpty && (poster.startsWith('http://') || poster.startsWith('https://'))) {
      return ImageOptimizer.cachedImage(
        imageUrl: poster,
        fit: BoxFit.cover,
        memCacheWidth: 720,
        memCacheHeight: 1080,
      );
    }

    return Container(
      color: const Color(0xFF18181B),
      child: const Center(
        child: GoldenSweepLoader(size: 38),
      ),
    );
  }
}
