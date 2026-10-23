package com.vrajcreation.app.models

import java.io.Serializable

enum class NotificationType {
    productAdded,
    productUpdated,
    categoryUpdated,
    orderStatus,
    bannerDrop,
    adminBroadcast,
    systemAlert
}

data class Product(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val price: Double = 0.0,
    val oldPrice: Double = 0.0,
    val discount: Double = 0.0,
    val brand: String = "Vraj Creation",
    val category: String = "Menswear",
    val subCategory: String = "",
    val images: List<String> = emptyList(),
    val sizes: List<String> = listOf("S", "M", "L", "XL", "XXL"),
    val colors: List<String> = emptyList(),
    val bestseller: Boolean = false,
    val isFeatured: Boolean = false,
    val rating: Double = 5.0,
    val reviewsCount: Int = 24
) : Serializable {
    val primaryImage: String
        get() = images.firstOrNull { it.isNotEmpty() } ?: ""
}

data class HomeBanner(
    val id: String = "",
    val title1: String = "Vraj",
    val title2: String = "SaiAagaman",
    val subtitle: String = "Exclusive Collection",
    val tagline: String = "Royal Couture 2026",
    val mediaUrl: String = "",
    val mediaType: String = "image",
    val link: String = "",
    val explicitPoster: String = "",
    val order: Int = 999,
    val tag: String = ""
) : Serializable {
    val posterUrl: String
        get() {
            if (explicitPoster.isNotEmpty() && !explicitPoster.endsWith(".mp4")) {
                return explicitPoster
            }
            if (mediaUrl.contains("cloudinary.com") && mediaUrl.contains("/video/upload/")) {
                return mediaUrl
                    .replace(Regex("\\.(mp4|webm|mov|avi|mkv)$", RegexOption.IGNORE_CASE), ".jpg")
                    .replace("/video/upload/", "/video/upload/so_0,w_720,c_limit,f_jpg,q_auto/")
            }
            if (mediaUrl.endsWith(".mp4") || mediaUrl.endsWith(".webm") || mediaUrl.contains("/video/upload/")) {
                return ""
            }
            return mediaUrl
        }
}

data class AboutSlide(
    val id: String = "",
    val title: String = "",
    val tag: String = "",
    val caption: String = "",
    val src: String = "",
    val order: Int = 0
) : Serializable

data class ContactInfo(
    val id: String = "main",
    val title: String = "Office & Showroom",
    val address: String = "Vraj Creation Flagship Studio, Ring Road Textile Market, Surat, Gujarat 395002",
    val phone: String = "+91 98765 43210",
    val email: String = "concierge@vrajcreation.com",
    val supportHours: String = "Mon - Sat: 10:00 AM - 8:30 PM",
    val image: String = "",
    val videoUrl: String = ""
) : Serializable

data class ReviewItem(
    val id: String = "",
    val productId: String = "",
    val userName: String = "Valued Patron",
    val userEmail: String = "",
    val rating: Double = 5.0,
    val comment: String = "",
    val date: String = ""
) : Serializable

data class CartItem(
    val product: Product,
    var size: String = "Standard",
    var color: String = "",
    var quantity: Int = 1
) : Serializable {
    val totalPrice: Double
        get() = product.price * quantity
}

data class OrderItem(
    val productId: String = "",
    val name: String = "",
    val price: Double = 0.0,
    val quantity: Int = 1,
    val size: String = "Standard",
    val color: String = "",
    val image: String = ""
) : Serializable

data class Order(
    val id: String = "",
    val orderId: String = "",
    val customerName: String = "",
    val customerEmail: String = "",
    val phone: String = "",
    val address: String = "",
    val city: String = "",
    val state: String = "",
    val pincode: String = "",
    val amount: Double = 0.0,
    val status: String = "Order Placed",
    val paymentMethod: String = "Cash on Delivery",
    val items: List<OrderItem> = emptyList(),
    val createdAt: String = ""
) : Serializable

data class User(
    val id: String = "",
    val name: String = "Valued Patron",
    val email: String = "",
    val phone: String = "",
    val role: String = "customer",
    val address: String = "",
    val city: String = "",
    val state: String = "",
    val pincode: String = "",
    val avatar: String = ""
) : Serializable

data class AppNotificationItem(
    val id: String,
    val title: String,
    val message: String,
    val type: NotificationType = NotificationType.adminBroadcast,
    val timestamp: Long = System.currentTimeMillis(),
    val data: Map<String, Any?>? = null,
    var isRead: Boolean = false
) : Serializable
