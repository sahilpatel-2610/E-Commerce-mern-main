class Product {
  final String id;
  final String name;
  final String description;
  final double price;
  final double oldPrice;
  final double discount;
  final String brand;
  final String category;
  final String subCategory;
  final List<String> images;
  final List<String> sizes;
  final List<String> colors;
  final bool bestseller;
  final bool isFeatured;
  final double rating;
  final int reviewsCount;

  Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.oldPrice,
    this.discount = 0.0,
    required this.brand,
    required this.category,
    this.subCategory = '',
    required this.images,
    required this.sizes,
    this.colors = const [],
    this.bestseller = false,
    this.isFeatured = false,
    this.rating = 5.0,
    this.reviewsCount = 0,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    List<String> imgList = [];
    if (json['images'] != null) {
      if (json['images'] is List) {
        imgList = (json['images'] as List)
            .map((e) => e.toString().trim())
            .where((s) => s.isNotEmpty)
            .toList();
      } else if (json['images'].toString().trim().isNotEmpty) {
        imgList = [json['images'].toString().trim()];
      }
    }
    if (imgList.isEmpty && json['image'] != null) {
      if (json['image'] is List) {
        imgList = (json['image'] as List)
            .map((e) => e.toString().trim())
            .where((s) => s.isNotEmpty)
            .toList();
      } else if (json['image'].toString().trim().isNotEmpty) {
        imgList = [json['image'].toString().trim()];
      }
    }

    List<String> sizeList = [];
    if (json['sizes'] != null) {
      if (json['sizes'] is List) {
        sizeList = (json['sizes'] as List)
            .map((e) => e.toString().trim())
            .where((s) => s.isNotEmpty)
            .toList();
      } else if (json['sizes'].toString().trim().isNotEmpty) {
        sizeList = [json['sizes'].toString().trim()];
      }
    } else if (json['size'] != null) {
      if (json['size'] is List) {
        sizeList = (json['size'] as List)
            .map((e) => e.toString().trim())
            .where((s) => s.isNotEmpty)
            .toList();
      } else if (json['size'].toString().trim().isNotEmpty) {
        sizeList = [json['size'].toString().trim()];
      }
    }

    List<String> colorList = [];
    if (json['colors'] != null && json['colors'] is List) {
      colorList = (json['colors'] as List)
          .map((e) => e.toString().trim())
          .where((s) => s.isNotEmpty)
          .toList();
    }

    final p = double.tryParse(json['price']?.toString() ?? '0') ?? 0.0;
    final op = double.tryParse(json['oldPrice']?.toString() ?? '0') ?? 0.0;
    double d = double.tryParse(json['discount']?.toString() ?? '0') ?? 0.0;
    if (d == 0 && op > p && op > 0) {
      d = (((op - p) / op) * 100).roundToDouble();
    }

    final isBest = json['bestseller'] == true ||
        json['bestseller']?.toString().toLowerCase() == 'true' ||
        json['isFeatured'] == true;
    final isFeat = json['isFeatured'] == true ||
        json['isFeatured']?.toString().toLowerCase() == 'true';

    final subCat = json['subCategory']?.toString() ?? json['subCat']?.toString() ?? '';

    return Product(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      price: p,
      oldPrice: op,
      discount: d,
      brand: json['brand']?.toString() ?? '',
      category: json['category']?.toString() ?? json['catName']?.toString() ?? '',
      subCategory: subCat,
      images: imgList,
      sizes: sizeList,
      colors: colorList,
      bestseller: isBest,
      isFeatured: isFeat,
      rating: double.tryParse(json['rating']?.toString() ?? '5') ?? 5.0,
      reviewsCount: int.tryParse(json['reviewsCount']?.toString() ?? '0') ?? 0,
    );
  }

  String get image => images.isNotEmpty ? images.first : '';

  Map<String, dynamic> toJson() => {
        '_id': id,
        'id': id,
        'name': name,
        'description': description,
        'price': price,
        'oldPrice': oldPrice,
        'discount': discount,
        'brand': brand,
        'category': category,
        'subCategory': subCategory,
        'images': images,
        'sizes': sizes,
        'colors': colors,
        'bestseller': bestseller,
        'isFeatured': isFeatured,
        'rating': rating,
        'reviewsCount': reviewsCount,
      };
}

