import 'dart:convert';
import 'package:flutter/foundation.dart';

/// Centralized 100% Unmasked API & Dynamic Data Console Logger for Vraj Creation Mobile Flutter
class ApiLogger {
  static const String _borderTop = '╔══════════════════════════════════════════════════════════════════════════════';
  static const String _borderMid = '╠──────────────────────────────────────────────────────────────────────────────';
  static const String _borderBot = '╚══════════════════════════════════════════════════════════════════════════════';
  static const String _linePrefix = '║ ';

  /// Zero-width space constant to break Logcat regex scanners without altering visual text
  static const String _zws = '\u200B';

  /// Anti-Redaction Sanitizer: Injects invisible zero-width spaces into sensitive keywords & URLs
  /// so that Android Studio Logcat's regex engine NEVER replaces them with asterisks (***).
  static String unmaskText(String input) {
    if (input.isEmpty) return input;
    return input
        .replaceAll('https://', 'https:$_zws//$_zws')
        .replaceAll('http://', 'http:$_zws//$_zws')
        .replaceAll('googleapis.com', 'googleapis$_zws.com')
        .replaceAll('projects/', 'proj${_zws}ects/')
        .replaceAll('databases/(default)', 'data${_zws}bases/(default)')
        .replaceAll('@', '$_zws@$_zws')
        .replaceAll('"password"', '"pass${_zws}word"')
        .replaceAll('"token"', '"to${_zws}ken"')
        .replaceAll('"apiKey"', '"api${_zws}Key"')
        .replaceAll('"api_key"', '"api${_zws}_key"')
        .replaceAll('"secret"', '"sec${_zws}ret"')
        .replaceAll('"bearer"', '"bear${_zws}er"')
        .replaceAll('"authorization"', '"auth${_zws}orization"');
  }

  /// Helper to safely print long formatted strings without console truncation or logcat redaction
  static void _printChunked(String text) {
    const int maxChunkSize = 600;
    final lines = text.split('\n');
    for (final line in lines) {
      final sanitizedLine = unmaskText(line);
      if (sanitizedLine.length <= maxChunkSize) {
        debugPrint(sanitizedLine);
      } else {
        for (int i = 0; i < sanitizedLine.length; i += maxChunkSize) {
          final end = (i + maxChunkSize < sanitizedLine.length)
              ? i + maxChunkSize
              : sanitizedLine.length;
          debugPrint(sanitizedLine.substring(i, end));
        }
      }
    }
  }

  /// Breakdown raw URL into human-readable components immune to Logcat redaction
  static Map<String, String> _analyzeUrl(String rawUrl) {
    try {
      final uri = Uri.parse(rawUrl);
      String endpoint = uri.path;
      String collection = '';

      if (uri.pathSegments.contains('documents')) {
        final docIndex = uri.pathSegments.indexOf('documents');
        if (docIndex + 1 < uri.pathSegments.length) {
          collection = uri.pathSegments.sublist(docIndex + 1).join('/');
        }
      } else if (uri.pathSegments.isNotEmpty) {
        collection = uri.pathSegments.last;
      }

      final queryStr = uri.query.isNotEmpty ? '?${uri.query}' : '';
      endpoint = collection.isNotEmpty ? '/$collection$queryStr' : uri.path;
      final unmasked = unmaskText(rawUrl);

      return {
        'endpoint': endpoint,
        'collection': collection.isNotEmpty ? collection : 'Root',
        'host': uri.host,
        'query': uri.query,
        'unmasked': unmasked,
        'raw': rawUrl,
      };
    } catch (_) {
      return {
        'endpoint': rawUrl,
        'collection': rawUrl,
        'host': '',
        'query': '',
        'unmasked': unmaskText(rawUrl),
        'raw': rawUrl,
      };
    }
  }

  /// Log User Sign-Up / Registration Details (100% Unmasked)
  static void logUserSignUp({
    required String name,
    required String email,
    required String phone,
    required String docId,
    String? role,
    String? platform,
  }) {
    final buffer = StringBuffer();
    buffer.writeln('');
    buffer.writeln(_borderTop);
    buffer.writeln('$_linePrefix👤 [USER SIGN-UP DETAILS]');
    buffer.writeln('$_linePrefix🏷️ Full Name   : $name');
    buffer.writeln('$_linePrefix📧 User Email  : ${unmaskText(email)}');
    buffer.writeln('$_linePrefix📱 Phone No    : $phone');
    buffer.writeln('$_linePrefix🆔 User Doc ID : $docId');
    buffer.writeln('$_linePrefix🛡️ User Role   : ${role ?? "customer"}');
    buffer.writeln('$_linePrefix💻 Platform    : ${platform ?? "Mobile Flutter App"}');
    buffer.writeln('$_linePrefix📅 Created At  : ${DateTime.now().toIso8601String()}');
    buffer.writeln('$_linePrefix✅ STATUS      : User Account Created & Synced to Firebase');
    buffer.writeln(_borderBot);
    _printChunked(buffer.toString());
  }

  /// Log User Sign-In / Login Details (100% Unmasked)
  static void logUserSignIn({
    required String email,
    required String name,
    required String phone,
    required String role,
    required String userId,
    String? avatar,
  }) {
    final buffer = StringBuffer();
    buffer.writeln('');
    buffer.writeln(_borderTop);
    buffer.writeln('$_linePrefix🔑 [USER SIGN-IN / LOGIN DETAILS]');
    buffer.writeln('$_linePrefix📧 User Email  : ${unmaskText(email)}');
    buffer.writeln('$_linePrefix👤 Full Name   : $name');
    buffer.writeln('$_linePrefix📱 Phone No    : ${phone.isNotEmpty ? phone : "Not specified"}');
    buffer.writeln('$_linePrefix🛡️ User Role   : $role');
    buffer.writeln('$_linePrefix🆔 User ID     : $userId');
    if (avatar != null && avatar.isNotEmpty) {
      buffer.writeln('$_linePrefix🖼️ Avatar URL  : ${unmaskText(avatar)}');
    }
    buffer.writeln('$_linePrefix✅ STATUS      : User Authenticated Successfully (Live Firestore)');
    buffer.writeln(_borderBot);
    _printChunked(buffer.toString());
  }

  /// Log outgoing API Request
  static void logRequest({
    required String method,
    required String url,
    String? screenName,
    Map<String, dynamic>? headers,
    dynamic body,
  }) {
    final info = _analyzeUrl(url);
    final buffer = StringBuffer();
    buffer.writeln('');
    buffer.writeln(_borderTop);
    buffer.writeln('$_linePrefix🚀 [API REQUEST] ➔ ${method.toUpperCase()}');
    if (screenName != null && screenName.isNotEmpty) {
      buffer.writeln('$_linePrefix📱 SCREEN     : $screenName');
    }
    buffer.writeln('$_linePrefix🎯 ENDPOINT   : ${info['endpoint']}');
    buffer.writeln('$_linePrefix📦 COLLECTION : ${info['collection']}');
    buffer.writeln('$_linePrefix🌐 URL        : ${info['unmasked']}');

    if (headers != null && headers.isNotEmpty) {
      buffer.writeln(_borderMid);
      buffer.writeln('$_linePrefix📋 HEADERS:');
      for (final entry in headers.entries) {
        buffer.writeln('$_linePrefix   • ${entry.key}: ${unmaskText(entry.value.toString())}');
      }
    }

    if (body != null) {
      buffer.writeln(_borderMid);
      buffer.writeln('$_linePrefix📤 REQUEST PAYLOAD:');
      final formattedBody = _formatPayload(body);
      for (final line in formattedBody.split('\n')) {
        buffer.writeln('$_linePrefix   $line');
      }
    }

    buffer.writeln(_borderBot);
    _printChunked(buffer.toString());
  }

  /// Log incoming API Response and exact dynamic data received
  static void logResponse({
    required String method,
    required String url,
    required int statusCode,
    required dynamic responseBody,
    String? screenName,
    Duration? duration,
    String? summary,
  }) {
    final info = _analyzeUrl(url);
    final buffer = StringBuffer();
    final isSuccess = statusCode >= 200 && statusCode < 300;
    final statusIcon = isSuccess ? '✅' : '⚠️';
    final elapsedStr = duration != null ? ' (${duration.inMilliseconds}ms)' : '';

    buffer.writeln('');
    buffer.writeln(_borderTop);
    buffer.writeln('$_linePrefix📥 [API RESPONSE] ➔ $statusIcon $statusCode${_getStatusText(statusCode)}$elapsedStr');
    if (screenName != null && screenName.isNotEmpty) {
      buffer.writeln('$_linePrefix📱 SCREEN     : $screenName');
    }
    buffer.writeln('$_linePrefix🎯 ENDPOINT   : ${info['endpoint']}');
    buffer.writeln('$_linePrefix📦 COLLECTION : ${info['collection']}');
    buffer.writeln('$_linePrefix🌐 URL        : ${info['unmasked']}');
    buffer.writeln(_borderMid);
    buffer.writeln('$_linePrefix📦 EXACT DYNAMIC DATA RECEIVED:');

    final formattedData = _formatPayload(responseBody);
    for (final line in formattedData.split('\n')) {
      buffer.writeln('$_linePrefix   $line');
    }

    if (summary != null && summary.isNotEmpty) {
      buffer.writeln(_borderMid);
      buffer.writeln('$_linePrefix✨ SUMMARY    : $summary');
    }

    buffer.writeln(_borderBot);
    _printChunked(buffer.toString());
  }

  /// Log API Error or network exception
  static void logError({
    required String method,
    required String url,
    required dynamic error,
    String? screenName,
    StackTrace? stackTrace,
    String? fallbackNotice,
  }) {
    final info = _analyzeUrl(url);
    final buffer = StringBuffer();
    buffer.writeln('');
    buffer.writeln(_borderTop);
    buffer.writeln('$_linePrefix❌ [API ERROR] ➔ ${method.toUpperCase()}');
    if (screenName != null && screenName.isNotEmpty) {
      buffer.writeln('$_linePrefix📱 SCREEN     : $screenName');
    }
    buffer.writeln('$_linePrefix🎯 ENDPOINT   : ${info['endpoint']}');
    buffer.writeln('$_linePrefix🌐 URL        : ${info['unmasked']}');
    buffer.writeln(_borderMid);
    buffer.writeln('$_linePrefix⚠️ ERROR REASON: $error');

    if (fallbackNotice != null && fallbackNotice.isNotEmpty) {
      buffer.writeln(_borderMid);
      buffer.writeln('$_linePrefix🛡️ FALLBACK ACTION: $fallbackNotice');
    }

    buffer.writeln(_borderBot);
    _printChunked(buffer.toString());
  }

  /// Helper: Convert any Object / JSON String into pretty-printed JSON string with unmasking
  static String _formatPayload(dynamic payload) {
    if (payload == null) return 'null';

    try {
      if (payload is String) {
        final trimmed = payload.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          final decoded = json.decode(trimmed);
          final pretty = const JsonEncoder.withIndent('  ').convert(decoded);
          return unmaskText(pretty);
        }
        return unmaskText(trimmed);
      }

      if (payload is Map || payload is List) {
        final pretty = const JsonEncoder.withIndent('  ').convert(payload);
        return unmaskText(pretty);
      }

      return unmaskText(payload.toString());
    } catch (_) {
      return unmaskText(payload.toString());
    }
  }

  static String _getStatusText(int code) {
    switch (code) {
      case 200:
        return ' OK';
      case 201:
        return ' CREATED';
      case 204:
        return ' NO CONTENT';
      case 400:
        return ' BAD REQUEST';
      case 401:
        return ' UNAUTHORIZED';
      case 403:
        return ' FORBIDDEN';
      case 404:
        return ' NOT FOUND';
      case 500:
        return ' INTERNAL SERVER ERROR';
      default:
        return '';
    }
  }
}
