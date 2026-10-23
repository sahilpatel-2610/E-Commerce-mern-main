class HomeBanner {
  final String id;
  final String title1;
  final String title2;
  final String subtitle;
  final String tagline;
  final String mediaUrl;
  final String mediaType;
  final String link;
  final String explicitPoster;
  final int order;
  final String tag;

  HomeBanner({
    required this.id,
    required this.title1,
    required this.title2,
    required this.subtitle,
    required this.tagline,
    required this.mediaUrl,
    required this.mediaType,
    required this.link,
    this.explicitPoster = '',
    this.order = 999,
    this.tag = '',
  });

  String get posterUrl {
    if (explicitPoster.isNotEmpty &&
        !explicitPoster.endsWith('.mp4') &&
        !explicitPoster.endsWith('.webm') &&
        !explicitPoster.endsWith('.mov')) {
      return explicitPoster;
    }
    if (mediaUrl.contains('cloudinary.com') && mediaUrl.contains('/video/upload/')) {
      return mediaUrl
          .replaceAll(RegExp(r'\.(mp4|webm|mov|avi|mkv)$', caseSensitive: false), '.jpg')
          .replaceFirst('/video/upload/', '/video/upload/so_0,w_720,c_limit,f_jpg,q_auto/');
    }
    // Never return an MP4/video string as a poster URL
    if (mediaUrl.endsWith('.mp4') ||
        mediaUrl.endsWith('.webm') ||
        mediaUrl.endsWith('.mov') ||
        mediaUrl.contains('/video/upload/')) {
      return '';
    }
    return mediaUrl;
  }

  factory HomeBanner.fromJson(Map<String, dynamic> json) {
    String media = '';
    final candidateKeys = ['video', 'videoUrl', 'imageUrl', 'image', 'mediaUrl', 'src', 'url'];
    for (final k in candidateKeys) {
      final v = json[k]?.toString().trim() ?? '';
      if (v.isNotEmpty) {
        media = v;
        break;
      }
    }

    String explicitPoster = '';
    final posterKeys = ['poster', 'posterUrl', 'thumbnail', 'imageUrl', 'image'];
    for (final k in posterKeys) {
      final v = json[k]?.toString().trim() ?? '';
      if (v.isNotEmpty &&
          !v.endsWith('.mp4') &&
          !v.endsWith('.webm') &&
          !v.endsWith('.mov') &&
          !v.contains('/video/upload/')) {
        explicitPoster = v;
        break;
      }
    }

    String type = json['mediaType']?.toString().trim() ?? '';
    if (type.isEmpty || type == 'null') {
      type = (media.endsWith('.mp4') ||
              media.endsWith('.webm') ||
              media.endsWith('.mov') ||
              media.contains('/video/upload/'))
          ? 'video'
          : 'image';
    }

    final rawOrder = json['order'] ?? json['displayOrder'];
    final int parsedOrder = rawOrder != null ? int.tryParse(rawOrder.toString()) ?? 999 : 999;
    final String parsedTag = json['tag']?.toString().trim() ??
        json['badgeTag']?.toString().trim() ??
        json['subtitle']?.toString().trim() ??
        '';

    return HomeBanner(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title1: (json['title1'] != null && json['title1'].toString().trim().isNotEmpty)
          ? json['title1'].toString().trim()
          : (json['bannerTitle']?.toString().trim() ?? ''),
      title2: (json['title2'] != null && json['title2'].toString().trim().isNotEmpty)
          ? json['title2'].toString().trim()
          : (json['productName']?.toString().trim() ?? ''),
      subtitle: (json['subtitle'] != null && json['subtitle'].toString().trim().isNotEmpty)
          ? json['subtitle'].toString().trim()
          : (parsedTag.isNotEmpty ? parsedTag : (json['name']?.toString().trim() ?? '')),
      tagline: json['tagline']?.toString().trim() ?? '',
      mediaUrl: media,
      mediaType: type,
      link: json['link']?.toString().trim() ?? '',
      explicitPoster: explicitPoster,
      order: parsedOrder,
      tag: parsedTag,
    );
  }
}
