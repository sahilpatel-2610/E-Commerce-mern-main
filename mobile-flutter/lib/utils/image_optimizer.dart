import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class ImageOptimizer {
  /// Optimizes Cloudinary or HTTP image URLs with dynamic compression and sizing.
  /// If given a Cloudinary video URL, automatically converts it into a static image frame (poster).
  /// Optimizes Cloudinary or HTTP image URLs with dynamic compression and sizing.
  /// If given a Cloudinary video URL, automatically converts it into a static image frame (poster).
  static String optimizeUrl(String url, {int width = 500}) {
    final trimmed = url.trim();
    if (trimmed.isEmpty) return '';

    // Convert Cloudinary video URL to static image poster
    if (trimmed.contains('res.cloudinary.com') && trimmed.contains('/upload/')) {
      if (trimmed.contains('/video/upload/')) {
        final uploadIndex = trimmed.indexOf('/upload/');
        final prefix = trimmed.substring(0, uploadIndex + 8);
        var rest = trimmed.substring(uploadIndex + 8);

        final versionMatch = RegExp(r'(v\d+/.+)').firstMatch(rest);
        if (versionMatch != null) {
          rest = versionMatch.group(1)!;
        }

        if (rest.endsWith('.mp4') || rest.endsWith('.mov') || rest.endsWith('.webm') || rest.endsWith('.mkv')) {
          final dotIdx = rest.lastIndexOf('.');
          rest = rest.substring(0, dotIdx) + '.jpg';
        } else if (!rest.endsWith('.jpg') && !rest.endsWith('.png') && !rest.endsWith('.webp')) {
          rest = '$rest.jpg';
        }

        return '${prefix}so_0,w_$width,c_limit,f_jpg,q_auto/$rest';
      }

      if (!trimmed.contains('/q_auto') && !trimmed.contains('/f_auto')) {
        return trimmed.replaceFirst(
          '/upload/',
          '/upload/f_auto,q_auto:eco,w_$width,c_limit/',
        );
      }
    }
    return trimmed;
  }

  /// Alias for backward compatibility
  static String getCloudinaryOptimizedUrl(String url, {int width = 500}) {
    return optimizeUrl(url, width: width);
  }

  /// Optimizes Cloudinary video URLs for instant 0ms CDN streaming with standard 720p H.264 Baseline/Main profile
  static String optimizeVideoUrl(String url, {int width = 720}) {
    final trimmed = url.trim();
    if (trimmed.isEmpty) return '';

    if (trimmed.contains('res.cloudinary.com') && trimmed.contains('/upload/')) {
      final uploadIndex = trimmed.indexOf('/upload/');
      final prefix = trimmed.substring(0, uploadIndex + 8);
      var rest = trimmed.substring(uploadIndex + 8);

      final versionMatch = RegExp(r'(v\d+/.+)').firstMatch(rest);
      if (versionMatch != null) {
        rest = versionMatch.group(1)!;
      } else {
        final slashIdx = rest.indexOf('/');
        if (slashIdx != -1 && rest.substring(0, slashIdx).contains(',')) {
          rest = rest.substring(slashIdx + 1);
        }
      }

      return '${prefix}vc_h264:main:3.1,w_$width,c_limit,q_auto:good,f_mp4/$rest';
    }
    return trimmed;
  }

  /// Fast, low-memory cached image widget with instant rendering, video poster safety, and dark placeholder
  static Widget cachedImage({
    required String imageUrl,
    BoxFit fit = BoxFit.cover,
    double? width,
    double? height,
    int memCacheWidth = 400,
    int memCacheHeight = 600,
    BorderRadius? borderRadius,
  }) {
    final optimized = optimizeUrl(imageUrl, width: memCacheWidth);

    if (optimized.isEmpty) {
      final placeholder = Container(
        width: width,
        height: height,
        color: const Color(0xFF141418),
        child: const Icon(Icons.checkroom_outlined, color: Colors.white24, size: 24),
      );
      return borderRadius != null ? ClipRRect(borderRadius: borderRadius, child: placeholder) : placeholder;
    }

    Widget image = CachedNetworkImage(
      imageUrl: optimized,
      fit: fit,
      width: width,
      height: height,
      memCacheWidth: memCacheWidth,
      memCacheHeight: memCacheHeight,
      maxWidthDiskCache: 800,
      maxHeightDiskCache: 1200,
      fadeInDuration: const Duration(milliseconds: 120),
      fadeOutDuration: const Duration(milliseconds: 80),
      placeholder: (_, __) => Container(
        width: width,
        height: height,
        color: const Color(0xFF131317),
      ),
      errorWidget: (_, __, ___) => Container(
        width: width,
        height: height,
        color: const Color(0xFF141418),
        child: const Icon(Icons.checkroom_outlined, color: Colors.white24, size: 24),
      ),
    );

    if (borderRadius != null) {
      return ClipRRect(borderRadius: borderRadius, child: image);
    }
    return image;
  }
}
