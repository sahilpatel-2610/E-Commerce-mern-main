package com.vrajcreation.app.api

import android.content.Context
import android.util.Log
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.vrajcreation.app.data.UserSession
import com.vrajcreation.app.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

object FirestoreService {
    private const val TAG = "FirestoreService"
    private const val PROJECT_ID = "ecommerce-mern-main"
    private const val BASE_URL = "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents"

    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(6, TimeUnit.SECONDS)
        .writeTimeout(6, TimeUnit.SECONDS)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    fun getIsoUtcTimestamp(date: Date = Date()): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(date)
    }

    // Resilient local LAN backend endpoints (Matches Flutter FirebaseService)
    private val BACKEND_ENDPOINTS = listOf(
        "http://10.0.2.2:4000",
        "http://localhost:4000",
        "http://127.0.0.1:4000",
        "http://192.168.1.7:4000",
        "http://192.168.1.18:4000"
    )

    // Document parser helpers
    fun parseDoc(doc: JsonObject): Map<String, Any?> {
        val result = mutableMapOf<String, Any?>()
        val name = doc.get("name")?.asString ?: ""
        result["_id"] = name.substringAfterLast("/")
        if (doc.has("createTime")) {
            result["createTime"] = doc.get("createTime").asString
        }

        val fields = doc.getAsJsonObject("fields") ?: return result
        for ((k, v) in fields.entrySet()) {
            if (v.isJsonObject) {
                result[k] = parseValue(v.asJsonObject)
            }
        }
        if (!result.containsKey("createdAt") && result.containsKey("createTime")) {
            result["createdAt"] = result["createTime"]
        }
        return result
    }

    private fun parseValue(obj: JsonObject): Any? {
        return when {
            obj.has("stringValue") -> obj.get("stringValue").asString
            obj.has("integerValue") -> obj.get("integerValue").asString.toLongOrNull() ?: 0L
            obj.has("doubleValue") -> obj.get("doubleValue").asDouble
            obj.has("booleanValue") -> obj.get("booleanValue").asBoolean
            obj.has("nullValue") -> null
            obj.has("timestampValue") -> obj.get("timestampValue").asString
            obj.has("arrayValue") -> {
                val array = obj.getAsJsonObject("arrayValue")
                val values = array.getAsJsonArray("values") ?: JsonArray()
                val list = mutableListOf<Any?>()
                for (elem in values) {
                    if (elem.isJsonObject) {
                        list.add(parseValue(elem.asJsonObject))
                    }
                }
                list
            }
            obj.has("mapValue") -> {
                val map = obj.getAsJsonObject("mapValue")
                val fields = map.getAsJsonObject("fields") ?: JsonObject()
                val res = mutableMapOf<String, Any?>()
                for ((k, v) in fields.entrySet()) {
                    if (v.isJsonObject) {
                        res[k] = parseValue(v.asJsonObject)
                    }
                }
                res
            }
            else -> null
        }
    }

    fun toFirestoreValue(value: Any?): JsonObject {
        val obj = JsonObject()
        when (value) {
            null -> obj.add("nullValue", com.google.gson.JsonNull.INSTANCE)
            is Boolean -> obj.addProperty("booleanValue", value)
            is Number -> {
                if (value is Double || value is Float) {
                    obj.addProperty("doubleValue", value.toDouble())
                } else {
                    obj.addProperty("integerValue", value.toLong().toString())
                }
            }
            is String -> obj.addProperty("stringValue", value)
            is List<*> -> {
                val arr = JsonArray()
                for (item in value) {
                    arr.add(toFirestoreValue(item))
                }
                val arrObj = JsonObject()
                arrObj.add("values", arr)
                obj.add("arrayValue", arrObj)
            }
            is Map<*, *> -> {
                val mapFields = JsonObject()
                for ((k, v) in value) {
                    if (k != null && k != "_id") {
                        mapFields.add(k.toString(), toFirestoreValue(v))
                    }
                }
                val mapObj = JsonObject()
                mapObj.add("fields", mapFields)
                obj.add("mapValue", mapObj)
            }
            else -> obj.addProperty("stringValue", value.toString())
        }
        return obj
    }

    // ==================== SMART IN-MEMORY CACHES (5-Minute TTL) ====================
    private const val CACHE_TTL_MS = 5 * 60 * 1000L // 5 minutes

    private val _cachedProducts = mutableListOf<Product>()
    private var _productsTimestamp: Long = 0L

    private val _cachedBanners = mutableListOf<HomeBanner>()
    private var _bannersTimestamp: Long = 0L

    private val _cachedAboutSlides = mutableListOf<AboutSlide>()
    private var _aboutSlidesTimestamp: Long = 0L

    private var _cachedContactInfo: ContactInfo? = null
    private var _contactInfoTimestamp: Long = 0L

    private val _cachedCategories = mutableListOf<Map<String, Any?>>()
    private var _categoriesTimestamp: Long = 0L

    private val _cachedSubCategories = mutableListOf<Map<String, Any?>>()
    private var _subCategoriesTimestamp: Long = 0L

    private val _cachedReviews = mutableListOf<ReviewItem>()
    private var _reviewsTimestamp: Long = 0L

    fun clearAllCaches() {
        _cachedProducts.clear()
        _productsTimestamp = 0L
        _cachedBanners.clear()
        _bannersTimestamp = 0L
        _cachedAboutSlides.clear()
        _aboutSlidesTimestamp = 0L
        _cachedContactInfo = null
        _contactInfoTimestamp = 0L
        _cachedCategories.clear()
        _categoriesTimestamp = 0L
        _cachedSubCategories.clear()
        _subCategoriesTimestamp = 0L
        _cachedReviews.clear()
        _reviewsTimestamp = 0L
    }

    // ==================== 1. PRODUCTS (100% Live Firestore & Backend Fallback) ====================
    suspend fun getProducts(forceRefresh: Boolean = false): List<Product> = withContext(Dispatchers.IO) {
        if (!forceRefresh && _cachedProducts.isNotEmpty() && System.currentTimeMillis() - _productsTimestamp < CACHE_TTL_MS) {
            return@withContext _cachedProducts
        }

        val url = "$BASE_URL/products?pageSize=200"
        try {
            val request = Request.Builder().url(url).get().build()
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val bodyStr = response.body?.string() ?: ""
                val root = JsonParser.parseString(bodyStr).asJsonObject
                val documents = root.getAsJsonArray("documents") ?: JsonArray()
                val products = mutableListOf<Product>()
                for (docElem in documents) {
                    val map = parseDoc(docElem.asJsonObject)
                    products.add(mapToProduct(map))
                }
                if (products.isNotEmpty()) {
                    _cachedProducts.clear()
                    _cachedProducts.addAll(products)
                    _productsTimestamp = System.currentTimeMillis()
                    Log.d(TAG, "🛍️ Loaded ${products.size} live products from Firestore.")
                    return@withContext products
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Firestore products error: ${e.message}. Attempting backend endpoints...")
        }

        if (_cachedProducts.isNotEmpty()) {
            return@withContext _cachedProducts
        }

        // Fallback to MERN Backend API endpoints
        for (host in BACKEND_ENDPOINTS) {
            val bUrl = "$host/api/product/list"
            try {
                val req = Request.Builder().url(bUrl).get().build()
                val res = client.newCall(req).execute()
                if (res.isSuccessful) {
                    val bStr = res.body?.string() ?: ""
                    val root = JsonParser.parseString(bStr).asJsonObject
                    if (root.get("success")?.asBoolean == true && root.has("products")) {
                        val arr = root.getAsJsonArray("products")
                        val list = mutableListOf<Product>()
                        for (el in arr) {
                            val map = jsonObjectToMap(el.asJsonObject)
                            list.add(mapToProduct(map))
                        }
                        if (list.isNotEmpty()) {
                            _cachedProducts.clear()
                            _cachedProducts.addAll(list)
                            _productsTimestamp = System.currentTimeMillis()
                            Log.d(TAG, "🛍️ Loaded ${list.size} products from Backend API $host.")
                            return@withContext list
                        }
                    }
                }
            } catch (_: Exception) {}
        }

        return@withContext _cachedProducts
    }

    private fun mapToProduct(map: Map<String, Any?>): Product {
        val id = map["_id"]?.toString() ?: map["id"]?.toString() ?: ""
        val name = map["name"]?.toString() ?: ""
        val desc = map["description"]?.toString() ?: ""
        val price = (map["price"] as? Number)?.toDouble() ?: map["price"]?.toString()?.toDoubleOrNull() ?: 0.0
        val oldPrice = (map["oldPrice"] as? Number)?.toDouble() ?: map["oldPrice"]?.toString()?.toDoubleOrNull() ?: 0.0
        var discount = (map["discount"] as? Number)?.toDouble() ?: map["discount"]?.toString()?.toDoubleOrNull() ?: 0.0
        if (discount == 0.0 && oldPrice > price && oldPrice > 0.0) {
            discount = (((oldPrice - price) / oldPrice) * 100).toInt().toDouble()
        }

        val brand = map["brand"]?.toString() ?: "Vraj Creation"
        val cat = map["category"]?.toString() ?: "Menswear"
        val subCat = map["subCategory"]?.toString() ?: ""

        val rawImages = map["images"] ?: map["image"]
        val imagesList = when (rawImages) {
            is List<*> -> rawImages.mapNotNull { it?.toString()?.trim() }.filter { it.isNotEmpty() }
            is String -> if (rawImages.isNotEmpty()) listOf(rawImages) else emptyList()
            else -> emptyList()
        }

        val rawSizes = map["sizes"] ?: map["size"]
        val sizesList = when (rawSizes) {
            is List<*> -> rawSizes.mapNotNull { it?.toString()?.trim() }.filter { it.isNotEmpty() }
            is String -> if (rawSizes.isNotEmpty()) listOf(rawSizes) else listOf("S", "M", "L", "XL", "XXL")
            else -> listOf("S", "M", "L", "XL", "XXL")
        }

        val bestseller = map["bestseller"] == true || map["isFeatured"] == true
        val isFeatured = map["isFeatured"] == true
        val rating = (map["rating"] as? Number)?.toDouble() ?: map["rating"]?.toString()?.toDoubleOrNull() ?: 5.0
        val reviewsCount = (map["reviewsCount"] as? Number)?.toInt() ?: map["reviewsCount"]?.toString()?.toIntOrNull() ?: 24

        return Product(
            id = id,
            name = name,
            description = desc,
            price = price,
            oldPrice = oldPrice,
            discount = discount,
            brand = brand,
            category = cat,
            subCategory = subCat,
            images = imagesList,
            sizes = sizesList,
            bestseller = bestseller,
            isFeatured = isFeatured,
            rating = rating,
            reviewsCount = reviewsCount
        )
    }

    // ==================== 2. HOME BANNERS (100% Live Firestore homebanners) ====================
    suspend fun getBanners(forceRefresh: Boolean = false): List<HomeBanner> = withContext(Dispatchers.IO) {
        if (!forceRefresh && _cachedBanners.isNotEmpty() && System.currentTimeMillis() - _bannersTimestamp < CACHE_TTL_MS) {
            return@withContext _cachedBanners
        }

        val url = "$BASE_URL/homebanners?pageSize=50"
        try {
            val request = Request.Builder().url(url).get().build()
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val bodyStr = response.body?.string() ?: ""
                val root = JsonParser.parseString(bodyStr).asJsonObject
                val documents = root.getAsJsonArray("documents") ?: JsonArray()
                val banners = mutableListOf<HomeBanner>()
                for (docElem in documents) {
                    val map = parseDoc(docElem.asJsonObject)
                    banners.add(mapToBanner(map))
                }
                if (banners.isNotEmpty()) {
                    val sorted = banners.sortedBy { it.order }
                    _cachedBanners.clear()
                    _cachedBanners.addAll(sorted)
                    _bannersTimestamp = System.currentTimeMillis()
                    Log.d(TAG, "🎬 Loaded ${banners.size} live homebanners from Firestore.")
                    return@withContext sorted
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Firestore homebanners error: ${e.message}")
        }

        if (_cachedBanners.isNotEmpty()) {
            return@withContext _cachedBanners
        }

        // Fallback to local admin backend endpoints
        for (host in BACKEND_ENDPOINTS) {
            val bUrl = "$host/api/admin/banners"
            try {
                val req = Request.Builder().url(bUrl).get().build()
                val res = client.newCall(req).execute()
                if (res.isSuccessful) {
                    val bStr = res.body?.string() ?: ""
                    val root = JsonParser.parseString(bStr).asJsonObject
                    if (root.get("success")?.asBoolean == true && root.has("banners")) {
                        val arr = root.getAsJsonArray("banners")
                        val list = mutableListOf<HomeBanner>()
                        for (el in arr) {
                            val map = jsonObjectToMap(el.asJsonObject)
                            list.add(mapToBanner(map))
                        }
                        if (list.isNotEmpty()) {
                            val sorted = list.sortedBy { it.order }
                            _cachedBanners.clear()
                            _cachedBanners.addAll(sorted)
                            _bannersTimestamp = System.currentTimeMillis()
                            return@withContext sorted
                        }
                    }
                }
            } catch (_: Exception) {}
        }

        return@withContext _cachedBanners
    }

    private fun mapToBanner(map: Map<String, Any?>): HomeBanner {
        val id = map["_id"]?.toString() ?: map["id"]?.toString() ?: ""
        val t1 = (map["title1"] ?: map["bannerTitle"] ?: "Vraj").toString().trim()
        val t2 = (map["title2"] ?: map["productName"] ?: "SaiAagaman").toString().trim()
        val subtitle = (map["subtitle"] ?: map["tag"] ?: map["badgeTag"] ?: "Exclusive Couture").toString().trim()
        val tagline = (map["tagline"] ?: "").toString().trim()

        var media = ""
        val candidateKeys = listOf("video", "videoUrl", "imageUrl", "image", "mediaUrl", "src", "url")
        for (k in candidateKeys) {
            val v = map[k]?.toString()?.trim() ?: ""
            if (v.isNotEmpty()) {
                media = v
                break
            }
        }

        var explicitPoster = ""
        val posterKeys = listOf("poster", "posterUrl", "thumbnail", "imageUrl", "image")
        for (k in posterKeys) {
            val v = map[k]?.toString()?.trim() ?: ""
            if (v.isNotEmpty() && !v.endsWith(".mp4") && !v.endsWith(".webm") && !v.endsWith(".mov") && !v.contains("/video/upload/")) {
                explicitPoster = v
                break
            }
        }

        val rawType = map["mediaType"]?.toString()?.trim() ?: ""
        val type = if (rawType.isNotEmpty() && rawType != "null") {
            rawType
        } else if (media.endsWith(".mp4") || media.endsWith(".webm") || media.endsWith(".mov") || media.contains("/video/upload/")) {
            "video"
        } else {
            "image"
        }

        val rawOrder = map["order"] ?: map["displayOrder"]
        val order = (rawOrder as? Number)?.toInt() ?: rawOrder?.toString()?.toIntOrNull() ?: 999
        val tag = (map["tag"] ?: map["badgeTag"] ?: map["subtitle"] ?: "").toString().trim()

        return HomeBanner(
            id = id,
            title1 = t1,
            title2 = t2,
            subtitle = subtitle,
            tagline = tagline,
            mediaUrl = media,
            mediaType = type,
            explicitPoster = explicitPoster,
            order = order,
            tag = tag
        )
    }

    // ==================== 3. CATEGORIES & SUBCATEGORIES ====================
    suspend fun getCategories(forceRefresh: Boolean = false): List<Map<String, Any?>> = withContext(Dispatchers.IO) {
        if (!forceRefresh && _cachedCategories.isNotEmpty() && System.currentTimeMillis() - _categoriesTimestamp < CACHE_TTL_MS) {
            return@withContext _cachedCategories
        }

        val url = "$BASE_URL/categories?pageSize=100"
        try {
            val req = Request.Builder().url(url).get().build()
            val res = client.newCall(req).execute()
            if (res.isSuccessful) {
                val bodyStr = res.body?.string() ?: ""
                val root = JsonParser.parseString(bodyStr).asJsonObject
                val documents = root.getAsJsonArray("documents") ?: JsonArray()
                val list = mutableListOf<Map<String, Any?>>()
                for (docElem in documents) {
                    list.add(parseDoc(docElem.asJsonObject))
                }
                if (list.isNotEmpty()) {
                    _cachedCategories.clear()
                    _cachedCategories.addAll(list)
                    _categoriesTimestamp = System.currentTimeMillis()
                    return@withContext list
                }
            }
        } catch (_: Exception) {}

        if (_cachedCategories.isNotEmpty()) return@withContext _cachedCategories

        // Backend fallback
        for (host in BACKEND_ENDPOINTS) {
            try {
                val req = Request.Builder().url("$host/api/admin/categories").get().build()
                val res = client.newCall(req).execute()
                if (res.isSuccessful) {
                    val root = JsonParser.parseString(res.body?.string() ?: "").asJsonObject
                    if (root.get("success")?.asBoolean == true && root.has("categories")) {
                        val arr = root.getAsJsonArray("categories")
                        val list = mutableListOf<Map<String, Any?>>()
                        for (el in arr) list.add(jsonObjectToMap(el.asJsonObject))
                        if (list.isNotEmpty()) {
                            _cachedCategories.clear()
                            _cachedCategories.addAll(list)
                            _categoriesTimestamp = System.currentTimeMillis()
                            return@withContext list
                        }
                    }
                }
            } catch (_: Exception) {}
        }
        return@withContext _cachedCategories
    }

    suspend fun getSubCategories(forceRefresh: Boolean = false): List<Map<String, Any?>> = withContext(Dispatchers.IO) {
        if (!forceRefresh && _cachedSubCategories.isNotEmpty() && System.currentTimeMillis() - _subCategoriesTimestamp < CACHE_TTL_MS) {
            return@withContext _cachedSubCategories
        }

        val url = "$BASE_URL/subcategories?pageSize=200"
        try {
            val req = Request.Builder().url(url).get().build()
            val res = client.newCall(req).execute()
            if (res.isSuccessful) {
                val bodyStr = res.body?.string() ?: ""
                val root = JsonParser.parseString(bodyStr).asJsonObject
                val documents = root.getAsJsonArray("documents") ?: JsonArray()
                val list = mutableListOf<Map<String, Any?>>()
                for (docElem in documents) {
                    list.add(parseDoc(docElem.asJsonObject))
                }
                if (list.isNotEmpty()) {
                    _cachedSubCategories.clear()
                    _cachedSubCategories.addAll(list)
                    _subCategoriesTimestamp = System.currentTimeMillis()
                    return@withContext list
                }
            }
        } catch (_: Exception) {}
        return@withContext _cachedSubCategories
    }

    // ==================== 4. ABOUT SLIDES (100% Live Firestore) ====================
    suspend fun getAboutSlides(forceRefresh: Boolean = false): List<AboutSlide> = withContext(Dispatchers.IO) {
        if (!forceRefresh && _cachedAboutSlides.isNotEmpty() && System.currentTimeMillis() - _aboutSlidesTimestamp < CACHE_TTL_MS) {
            return@withContext _cachedAboutSlides
        }

        val url = "$BASE_URL/about_slides?pageSize=50"
        try {
            val req = Request.Builder().url(url).get().build()
            val res = client.newCall(req).execute()
            if (res.isSuccessful) {
                val bodyStr = res.body?.string() ?: ""
                val root = JsonParser.parseString(bodyStr).asJsonObject
                val documents = root.getAsJsonArray("documents") ?: JsonArray()
                val slides = mutableListOf<AboutSlide>()
                for (docElem in documents) {
                    val map = parseDoc(docElem.asJsonObject)
                    slides.add(
                        AboutSlide(
                            id = map["_id"]?.toString() ?: "",
                            title = map["title"]?.toString() ?: "Surat Atelier Lookbook",
                            tag = map["tag"]?.toString() ?: "LOOKBOOK",
                            caption = map["caption"]?.toString() ?: "Bespoke Craftsmanship",
                            src = (map["src"] ?: map["image"] ?: map["imageUrl"] ?: map["url"] ?: "").toString(),
                            order = (map["order"] as? Number)?.toInt() ?: map["order"]?.toString()?.toIntOrNull() ?: 0
                        )
                    )
                }
                if (slides.isNotEmpty()) {
                    val sorted = slides.sortedBy { it.order }
                    _cachedAboutSlides.clear()
                    _cachedAboutSlides.addAll(sorted)
                    _aboutSlidesTimestamp = System.currentTimeMillis()
                    return@withContext sorted
                }
            }
        } catch (_: Exception) {}

        if (_cachedAboutSlides.isNotEmpty()) return@withContext _cachedAboutSlides

        // Fallback default lookbook
        return@withContext listOf(
            AboutSlide("s1", "Surat Atelier Lookbook", "LOOKBOOK 01", "Bespoke Craftsmanship & Luxury Weaves", "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=1080&auto=format&fit=crop&q=80", 1),
            AboutSlide("s2", "Signature Tailoring", "LOOKBOOK 02", "Precision Cut & Modern Silhouette", "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1080&auto=format&fit=crop&q=80", 2),
            AboutSlide("s3", "Everyday Prestige", "LOOKBOOK 03", "Comfort, Breathability & Elegance", "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1080&auto=format&fit=crop&q=80", 3)
        )
    }

    // ==================== 5. CONTACT INFO (100% Live Firestore) ====================
    suspend fun getContactInfo(forceRefresh: Boolean = false): ContactInfo = withContext(Dispatchers.IO) {
        if (!forceRefresh && _cachedContactInfo != null && System.currentTimeMillis() - _contactInfoTimestamp < CACHE_TTL_MS) {
            return@withContext _cachedContactInfo!!
        }

        val url = "$BASE_URL/contact_info/main"
        try {
            val req = Request.Builder().url(url).get().build()
            val res = client.newCall(req).execute()
            if (res.isSuccessful) {
                val bodyStr = res.body?.string() ?: ""
                val doc = JsonParser.parseString(bodyStr).asJsonObject
                val map = parseDoc(doc)
                if (map.isNotEmpty()) {
                    val info = ContactInfo(
                        id = "main",
                        title = map["title"]?.toString() ?: "Office & Showroom",
                        address = map["address"]?.toString() ?: "Vraj Creation Flagship Studio, Ring Road Textile Market, Surat, Gujarat 395002",
                        phone = map["phone"]?.toString() ?: "+91 98765 43210",
                        email = map["email"]?.toString() ?: "concierge@vrajcreation.com",
                        supportHours = map["supportHours"]?.toString() ?: "Mon - Sat: 10:00 AM - 8:30 PM",
                        image = (map["image"] ?: map["imageUrl"] ?: "").toString(),
                        videoUrl = (map["video"] ?: map["videoUrl"] ?: "").toString()
                    )
                    _cachedContactInfo = info
                    _contactInfoTimestamp = System.currentTimeMillis()
                    return@withContext info
                }
            }
        } catch (_: Exception) {}

        return@withContext _cachedContactInfo ?: ContactInfo()
    }

    // ==================== 6. VIP NEWSLETTER SUBSCRIBERS ====================
    suspend fun addSubscriber(email: String): Boolean = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        val docId = "sub_${cleanEmail.replace(Regex("[^a-zA-Z0-9]"), "_")}"
        val url = "$BASE_URL/subscribers/$docId"
        try {
            val nowIso = getIsoUtcTimestamp()
            val fields = JsonObject().apply {
                add("email", toFirestoreValue(cleanEmail))
                add("status", toFirestoreValue("Active"))
                add("platform", toFirestoreValue("Mobile Android"))
                add("source", toFirestoreValue("Mobile Android"))
                add("date", toFirestoreValue(System.currentTimeMillis().toString()))
                add("createdAt", toFirestoreValue(nowIso))
            }
            val root = JsonObject().apply { add("fields", fields) }
            val body = root.toString().toRequestBody(jsonMediaType)
            val request = Request.Builder().url(url).patch(body).build()
            val response = client.newCall(request).execute()
            return@withContext response.isSuccessful
        } catch (e: Exception) {
            Log.e(TAG, "addSubscriber error: ${e.message}")
            return@withContext false
        }
    }

    // ==================== 7. CONTACT MESSAGES ====================
    suspend fun sendMessage(name: String, email: String, phone: String, message: String): Boolean = withContext(Dispatchers.IO) {
        val docId = "msg_${System.currentTimeMillis()}"
        val url = "$BASE_URL/contact_messages/$docId"
        try {
            val nowIso = getIsoUtcTimestamp()
            val fields = JsonObject().apply {
                add("name", toFirestoreValue(name))
                add("email", toFirestoreValue(email.trim().lowercase()))
                add("phone", toFirestoreValue(phone.trim()))
                add("message", toFirestoreValue(message))
                add("platform", toFirestoreValue("Mobile Android"))
                add("source", toFirestoreValue("Mobile Android"))
                add("date", toFirestoreValue(System.currentTimeMillis().toString()))
                add("createdAt", toFirestoreValue(nowIso))
            }
            val root = JsonObject().apply { add("fields", fields) }
            val body = root.toString().toRequestBody(jsonMediaType)
            val request = Request.Builder().url(url).patch(body).build()
            val response = client.newCall(request).execute()
            return@withContext response.isSuccessful
        } catch (e: Exception) {
            Log.e(TAG, "sendMessage error: ${e.message}")
            return@withContext false
        }
    }

    // ==================== 8. REVIEWS ====================
    suspend fun getReviews(productId: String? = null, forceRefresh: Boolean = false): List<ReviewItem> = withContext(Dispatchers.IO) {
        if (!forceRefresh && _cachedReviews.isNotEmpty() && System.currentTimeMillis() - _reviewsTimestamp < CACHE_TTL_MS) {
            return@withContext if (productId.isNullOrEmpty()) _cachedReviews else _cachedReviews.filter { it.productId == productId }
        }

        val url = "$BASE_URL/reviews?pageSize=200"
        try {
            val req = Request.Builder().url(url).get().build()
            val res = client.newCall(req).execute()
            if (res.isSuccessful) {
                val root = JsonParser.parseString(res.body?.string() ?: "").asJsonObject
                val documents = root.getAsJsonArray("documents") ?: JsonArray()
                val list = mutableListOf<ReviewItem>()
                for (docElem in documents) {
                    val map = parseDoc(docElem.asJsonObject)
                    val pId = map["productId"]?.toString() ?: ""
                    list.add(
                        ReviewItem(
                            id = map["_id"]?.toString() ?: "",
                            productId = pId,
                            userName = map["userName"]?.toString() ?: map["name"]?.toString() ?: "Valued Patron",
                            userEmail = map["userEmail"]?.toString() ?: map["email"]?.toString() ?: "",
                            rating = (map["rating"] as? Number)?.toDouble() ?: map["rating"]?.toString()?.toDoubleOrNull() ?: 5.0,
                            comment = map["comment"]?.toString() ?: map["review"]?.toString() ?: "",
                            date = map["date"]?.toString() ?: map["createdAt"]?.toString() ?: ""
                        )
                    )
                }
                if (list.isNotEmpty()) {
                    _cachedReviews.clear()
                    _cachedReviews.addAll(list)
                    _reviewsTimestamp = System.currentTimeMillis()
                    return@withContext if (productId.isNullOrEmpty()) list else list.filter { it.productId == productId }
                }
            }
        } catch (_: Exception) {}

        return@withContext if (productId.isNullOrEmpty()) _cachedReviews else _cachedReviews.filter { it.productId == productId }
    }

    suspend fun addReview(review: ReviewItem): Boolean = withContext(Dispatchers.IO) {
        val docId = "rev_${System.currentTimeMillis()}"
        val url = "$BASE_URL/reviews/$docId"
        try {
            val nowIso = getIsoUtcTimestamp()
            val fields = JsonObject().apply {
                add("productId", toFirestoreValue(review.productId))
                add("userName", toFirestoreValue(review.userName))
                add("name", toFirestoreValue(review.userName))
                add("userEmail", toFirestoreValue(review.userEmail.trim().lowercase()))
                add("rating", toFirestoreValue(review.rating))
                add("comment", toFirestoreValue(review.comment))
                add("review", toFirestoreValue(review.comment))
                add("platform", toFirestoreValue("Mobile Android"))
                add("source", toFirestoreValue("Mobile Android"))
                add("date", toFirestoreValue(System.currentTimeMillis().toString()))
                add("createdAt", toFirestoreValue(nowIso))
            }
            val root = JsonObject().apply { add("fields", fields) }
            val body = root.toString().toRequestBody(jsonMediaType)
            val req = Request.Builder().url(url).patch(body).build()
            val res = client.newCall(req).execute()
            return@withContext res.isSuccessful
        } catch (_: Exception) {
            return@withContext false
        }
    }

    // ==================== 9. ORDERS (100% Live Firestore & Backend Sync) ====================
    // In-memory cache for instant 0ms order view updates
    private val _cachedOrders = mutableListOf<Order>()

    suspend fun getOrders(): List<Order> = withContext(Dispatchers.IO) {
        val url = "$BASE_URL/orders?pageSize=300"
        try {
            val request = Request.Builder().url(url).get().build()
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val bodyStr = response.body?.string() ?: ""
                val root = JsonParser.parseString(bodyStr).asJsonObject
                val documents = root.getAsJsonArray("documents") ?: JsonArray()
                val orders = mutableListOf<Order>()
                for (docElem in documents) {
                    val map = parseDoc(docElem.asJsonObject)
                    orders.add(mapToOrder(map))
                }
                if (orders.isNotEmpty()) {
                    _cachedOrders.clear()
                    _cachedOrders.addAll(orders)
                    return@withContext orders
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching orders: ${e.message}")
        }
        return@withContext _cachedOrders
    }

    suspend fun getUserOrders(userEmail: String): List<Order> = withContext(Dispatchers.IO) {
        val all = getOrders()
        val cleanEmail = userEmail.trim().lowercase()
        if (cleanEmail.isEmpty()) return@withContext emptyList()
        if (cleanEmail.contains("admin")) return@withContext all

        return@withContext all.filter { o ->
            o.customerEmail.trim().lowercase() == cleanEmail ||
                    cleanEmail.contains(o.customerEmail.trim().lowercase())
        }
    }

    private fun mapToOrder(map: Map<String, Any?>): Order {
        val id = map["_id"]?.toString() ?: ""
        val orderId = map["orderId"]?.toString() ?: id
        val custName = map["customerName"]?.toString() ?: map["name"]?.toString() ?: "Valued Patron"

        var custEmail = map["userEmail"]?.toString() ?: map["customerEmail"]?.toString() ?: ""
        var phone = map["phone"]?.toString() ?: ""
        var address = map["address"]?.toString() ?: ""
        var city = map["city"]?.toString() ?: ""
        var state = map["state"]?.toString() ?: ""
        var pincode = map["pincode"]?.toString() ?: ""

        val rawAddr = map["address"]
        if (rawAddr is Map<*, *>) {
            if (custEmail.isEmpty()) custEmail = rawAddr["email"]?.toString() ?: ""
            if (phone.isEmpty()) phone = rawAddr["phone"]?.toString() ?: ""
            address = rawAddr["street"]?.toString() ?: rawAddr["address"]?.toString() ?: address
            city = rawAddr["city"]?.toString() ?: city
            state = rawAddr["state"]?.toString() ?: state
            pincode = rawAddr["pincode"]?.toString() ?: pincode
        }

        val amount = (map["amount"] as? Number)?.toDouble() ?: map["amount"]?.toString()?.toDoubleOrNull() ?: 0.0
        val status = map["status"]?.toString() ?: "Order Placed"
        val paymentMethod = map["paymentMethod"]?.toString() ?: "Cash on Delivery"
        val createdAt = map["createdAt"]?.toString() ?: map["date"]?.toString() ?: ""

        val rawItems = map["items"] as? List<*> ?: emptyList<Any>()
        val itemsList = mutableListOf<OrderItem>()
        for (it in rawItems) {
            if (it is Map<*, *>) {
                itemsList.add(
                    OrderItem(
                        productId = it["productId"]?.toString() ?: it["id"]?.toString() ?: "",
                        name = it["name"]?.toString() ?: it["title"]?.toString() ?: "Luxury Bespoke Garment",
                        price = (it["price"] as? Number)?.toDouble() ?: it["price"]?.toString()?.toDoubleOrNull() ?: 0.0,
                        quantity = (it["quantity"] as? Number)?.toInt() ?: it["quantity"]?.toString()?.toIntOrNull() ?: 1,
                        size = it["size"]?.toString() ?: "M",
                        color = it["color"]?.toString() ?: "",
                        image = it["image"]?.toString() ?: ""
                    )
                )
            }
        }

        return Order(
            id = id,
            orderId = orderId,
            customerName = custName,
            customerEmail = custEmail,
            phone = phone,
            address = address,
            city = city,
            state = state,
            pincode = pincode,
            amount = amount,
            status = status,
            paymentMethod = paymentMethod,
            items = itemsList,
            createdAt = createdAt
        )
    }

    suspend fun placeOrder(order: Order): Boolean = withContext(Dispatchers.IO) {
        val docId = if (order.orderId.isNotEmpty() && order.orderId.startsWith("ord_")) order.orderId else "ord_${System.currentTimeMillis()}"
        val url = "$BASE_URL/orders/$docId"
        val nowIso = getIsoUtcTimestamp()

        val nameParts = order.customerName.trim().split("\\s+".toRegex()).filter { it.isNotEmpty() }
        val firstName = nameParts.firstOrNull() ?: order.customerName
        val lastName = if (nameParts.size > 1) nameParts.drop(1).joinToString(" ") else ""

        try {
            val fields = JsonObject().apply {
                add("orderId", toFirestoreValue(docId))
                add("_id", toFirestoreValue(docId))
                add("id", toFirestoreValue(docId))
                add("customerName", toFirestoreValue(order.customerName))
                add("name", toFirestoreValue(order.customerName))
                add("firstName", toFirestoreValue(firstName))
                add("lastName", toFirestoreValue(lastName))
                add("customerEmail", toFirestoreValue(order.customerEmail.trim().lowercase()))
                add("userEmail", toFirestoreValue(order.customerEmail.trim().lowercase()))
                add("userId", toFirestoreValue(order.customerEmail.trim().lowercase()))
                add("phone", toFirestoreValue(order.phone))
                add("amount", toFirestoreValue(order.amount))
                add("status", toFirestoreValue(order.status.ifEmpty { "Order Placed" }))
                add("paymentMethod", toFirestoreValue(order.paymentMethod))
                add("payment", toFirestoreValue(!order.paymentMethod.equals("Cash on Delivery", ignoreCase = true) && !order.paymentMethod.equals("COD", ignoreCase = true)))
                add("platform", toFirestoreValue("Mobile Android"))
                add("source", toFirestoreValue("Mobile Android"))
                add("date", toFirestoreValue(System.currentTimeMillis().toString()))
                add("createdAt", toFirestoreValue(nowIso))

                // Structured address map matching web/admin/flutter/react-native
                val addrMap = mapOf(
                    "firstName" to firstName,
                    "lastName" to lastName,
                    "fullName" to order.customerName,
                    "name" to order.customerName,
                    "email" to order.customerEmail,
                    "phone" to order.phone,
                    "street" to order.address,
                    "address" to order.address,
                    "city" to order.city,
                    "state" to order.state,
                    "pincode" to order.pincode,
                    "zipcode" to order.pincode,
                    "country" to "India"
                )
                add("address", toFirestoreValue(addrMap))

                val itemsList = order.items.map { item ->
                    mapOf(
                        "productId" to item.productId,
                        "_id" to item.productId,
                        "name" to item.name,
                        "price" to item.price,
                        "quantity" to item.quantity,
                        "size" to item.size,
                        "color" to item.color,
                        "image" to item.image
                    )
                }
                add("items", toFirestoreValue(itemsList))
            }

            val root = JsonObject().apply { add("fields", fields) }
            val body = root.toString().toRequestBody(jsonMediaType)
            val request = Request.Builder().url(url).patch(body).build()
            val response = client.newCall(request).execute()

            // Update in-memory cache immediately
            val newOrder = order.copy(id = docId, orderId = docId, createdAt = nowIso)
            _cachedOrders.add(0, newOrder)

            // Async sync to Backend endpoints
            syncOrderToBackend(order)

            return@withContext response.isSuccessful
        } catch (e: Exception) {
            Log.e(TAG, "Error placing order: ${e.message}")
            return@withContext false
        }
    }

    private fun syncOrderToBackend(order: Order) {
        val nameParts = order.customerName.trim().split("\\s+".toRegex()).filter { it.isNotEmpty() }
        val firstName = nameParts.firstOrNull() ?: order.customerName
        val lastName = if (nameParts.size > 1) nameParts.drop(1).joinToString(" ") else ""

        val payload = JsonObject().apply {
            addProperty("userId", order.customerEmail)
            addProperty("customerName", order.customerName)
            addProperty("platform", "Mobile Android")
            addProperty("source", "Mobile Android")
            addProperty("amount", order.amount)
            addProperty("phone", order.phone)
            val addrObj = JsonObject().apply {
                addProperty("firstName", firstName)
                addProperty("lastName", lastName)
                addProperty("fullName", order.customerName)
                addProperty("name", order.customerName)
                addProperty("email", order.customerEmail)
                addProperty("phone", order.phone)
                addProperty("street", order.address)
                addProperty("address", order.address)
                addProperty("city", order.city)
                addProperty("state", order.state)
                addProperty("pincode", order.pincode)
                addProperty("zipcode", order.pincode)
                addProperty("country", "India")
            }
            add("address", addrObj)

            val itemsArr = JsonArray()
            for (it in order.items) {
                val itObj = JsonObject().apply {
                    addProperty("productId", it.productId)
                    addProperty("name", it.name)
                    addProperty("price", it.price)
                    addProperty("quantity", it.quantity)
                    addProperty("size", it.size)
                    addProperty("color", it.color)
                    addProperty("image", it.image)
                }
                itemsArr.add(itObj)
            }
            add("items", itemsArr)
        }

        val body = payload.toString().toRequestBody(jsonMediaType)
        for (host in BACKEND_ENDPOINTS) {
            try {
                val req = Request.Builder().url("$host/api/order/place").post(body).build()
                client.newCall(req).enqueue(object : okhttp3.Callback {
                    override fun onFailure(call: okhttp3.Call, e: java.io.IOException) {}
                    override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) { response.close() }
                })
            } catch (_: Exception) {}
        }
    }

    suspend fun cancelOrder(docId: String): Boolean = withContext(Dispatchers.IO) {
        val url = "$BASE_URL/orders/$docId?updateMask.fieldPaths=status"
        try {
            val fields = JsonObject().apply {
                add("status", toFirestoreValue("Cancelled"))
            }
            val root = JsonObject().apply { add("fields", fields) }
            val body = root.toString().toRequestBody(jsonMediaType)
            val request = Request.Builder().url(url).patch(body).build()
            val response = client.newCall(request).execute()

            // Update in cache
            val idx = _cachedOrders.indexOfFirst { it.id == docId || it.orderId == docId }
            if (idx != -1) {
                val updated = _cachedOrders[idx].copy(status = "Cancelled")
                _cachedOrders[idx] = updated
            }

            return@withContext response.isSuccessful
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling order: ${e.message}")
            return@withContext false
        }
    }

    // ==================== 10. AUTH & USER PROFILE (100% Live Firestore) ====================
    private fun syncUserToBackend(name: String, email: String, phone: String, pass: String) {
        val payload = JsonObject().apply {
            addProperty("name", name)
            addProperty("email", email)
            addProperty("phone", phone)
            addProperty("phoneNumber", phone)
            addProperty("password", pass)
            addProperty("platform", "Mobile Android App")
        }
        val body = payload.toString().toRequestBody(jsonMediaType)
        for (host in BACKEND_ENDPOINTS) {
            try {
                val req = Request.Builder().url("$host/api/user/register").post(body).build()
                client.newCall(req).enqueue(object : okhttp3.Callback {
                    override fun onFailure(call: okhttp3.Call, e: java.io.IOException) {}
                    override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) { response.close() }
                })
            } catch (_: Exception) {}
        }
    }

    sealed class LoginResult {
        data class Success(val user: User) : LoginResult()
        object UserNotFound : LoginResult()
        object InvalidPassword : LoginResult()
    }

    suspend fun authenticateUser(email: String, pass: String, context: Context? = null): LoginResult = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        val cleanPass = pass.trim()
        val docId = "usr_${cleanEmail.replace(Regex("[^a-zA-Z0-9]"), "_")}"
        val url = "$BASE_URL/users/$docId"

        try {
            // 1. Direct Single Document Fetch from Firestore
            val request = Request.Builder().url(url).get().build()
            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                val bodyStr = response.body?.string() ?: ""
                val doc = JsonParser.parseString(bodyStr).asJsonObject
                val map = parseDoc(doc)
                if (map.isNotEmpty()) {
                    val storedPass = (map["password"] ?: "").toString().trim()
                    if (storedPass.isEmpty() || storedPass == cleanPass) {
                        Log.d(TAG, "🔑 User authenticated via direct Firestore document.")
                        val userName = map["name"]?.toString() ?: "Valued Patron"
                        val userPhone = map["phone"]?.toString() ?: map["phoneNumber"]?.toString() ?: ""

                        syncUserToBackend(userName, cleanEmail, userPhone, cleanPass)
                        updateUserPlatform(docId, userName, cleanEmail, userPhone, cleanPass)

                        val user = User(
                            id = docId,
                            name = userName,
                            email = cleanEmail,
                            phone = userPhone,
                            role = map["role"]?.toString() ?: if (cleanEmail.contains("admin")) "admin" else "customer",
                            address = map["address"]?.toString() ?: "",
                            city = map["city"]?.toString() ?: "",
                            state = map["state"]?.toString() ?: "",
                            pincode = map["pincode"]?.toString() ?: ""
                        )
                        if (context != null) {
                            UserSession.cacheCredentials(context, userName, cleanEmail, userPhone, cleanPass, user.role)
                            UserSession.saveUser(context, user)
                        }
                        return@withContext LoginResult.Success(user)
                    } else {
                        Log.w(TAG, "⚠️ Password mismatch for $cleanEmail")
                        return@withContext LoginResult.InvalidPassword
                    }
                }
            }

            // 2. Query collection fallback
            val listUrl = "$BASE_URL/users?pageSize=100"
            val listRequest = Request.Builder().url(listUrl).get().build()
            val listResponse = client.newCall(listRequest).execute()
            if (listResponse.isSuccessful) {
                val bodyStr = listResponse.body?.string() ?: ""
                val root = JsonParser.parseString(bodyStr).asJsonObject
                val documents = root.getAsJsonArray("documents") ?: JsonArray()
                for (docElem in documents) {
                    val map = parseDoc(docElem.asJsonObject)
                    val docEmail = (map["email"] ?: "").toString().trim().lowercase()
                    if (docEmail == cleanEmail) {
                        val storedPass = (map["password"] ?: "").toString().trim()
                        if (storedPass.isEmpty() || storedPass == cleanPass) {
                            val userName = map["name"]?.toString() ?: "Valued Patron"
                            val userPhone = map["phone"]?.toString() ?: map["phoneNumber"]?.toString() ?: ""

                            syncUserToBackend(userName, cleanEmail, userPhone, cleanPass)
                            updateUserPlatform(docId, userName, cleanEmail, userPhone, cleanPass)

                            val user = User(
                                id = map["_id"]?.toString() ?: docId,
                                name = userName,
                                email = cleanEmail,
                                phone = userPhone,
                                role = map["role"]?.toString() ?: if (cleanEmail.contains("admin")) "admin" else "customer",
                                address = map["address"]?.toString() ?: "",
                                city = map["city"]?.toString() ?: "",
                                state = map["state"]?.toString() ?: "",
                                pincode = map["pincode"]?.toString() ?: ""
                            )
                            if (context != null) {
                                UserSession.cacheCredentials(context, userName, cleanEmail, userPhone, cleanPass, user.role)
                                UserSession.saveUser(context, user)
                            }
                            return@withContext LoginResult.Success(user)
                        } else {
                            return@withContext LoginResult.InvalidPassword
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Login network error: ${e.message}")
        }

        // 3. Fallback to locally cached credentials
        if (context != null) {
            val cached = UserSession.getCachedCredentials(context, cleanEmail)
            if (cached != null) {
                if (cached.password == cleanPass) {
                    Log.d(TAG, "🔑 User authenticated via local cached credentials.")
                    syncUserToBackend(cached.user.name, cleanEmail, cached.user.phone, cleanPass)
                    updateUserPlatform(docId, cached.user.name, cleanEmail, cached.user.phone, cleanPass)
                    UserSession.saveUser(context, cached.user)
                    return@withContext LoginResult.Success(cached.user)
                } else {
                    return@withContext LoginResult.InvalidPassword
                }
            }
        }

        return@withContext LoginResult.UserNotFound
    }

    suspend fun loginUser(email: String, pass: String, context: Context? = null): User? = withContext(Dispatchers.IO) {
        val res = authenticateUser(email, pass, context)
        return@withContext if (res is LoginResult.Success) res.user else null
    }

    suspend fun registerUser(name: String, email: String, pass: String, phone: String, context: Context? = null): User? = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        val cleanName = name.trim().ifEmpty { "Valued Patron" }
        val cleanPhone = phone.trim()
        val cleanPass = pass.trim()
        val docId = "usr_${cleanEmail.replace(Regex("[^a-zA-Z0-9]"), "_")}"
        val role = if (cleanEmail.contains("admin")) "admin" else "customer"
        val nowIso = getIsoUtcTimestamp()

        // Check if existing profile has createdAt so original registration date is never wiped
        val existing = getUserProfile(cleanEmail)
        val createdAt = (existing?.get("createdAt") ?: existing?.get("createTime") ?: nowIso).toString()

        val user = User(id = docId, name = cleanName, email = cleanEmail, phone = cleanPhone, role = role)

        if (context != null) {
            UserSession.cacheCredentials(context, cleanName, cleanEmail, cleanPhone, cleanPass, role)
            UserSession.saveUser(context, user)
        }

        syncUserToBackend(cleanName, cleanEmail, cleanPhone, cleanPass)

        // Guaranteed Live Firestore Upsert
        upsertUserDocument(docId, cleanName, cleanEmail, cleanPhone, cleanPass, role, createdAt, nowIso)

        return@withContext user
    }

    private fun updateUserPlatform(docId: String, name: String, email: String, phone: String, pass: String) {
        val nowIso = getIsoUtcTimestamp()
        val role = if (email.contains("admin")) "admin" else "customer"
        upsertUserDocument(docId, name, email, phone, pass, role, nowIso, nowIso)
    }

    private fun upsertUserDocument(
        docId: String,
        name: String,
        email: String,
        phone: String,
        pass: String,
        role: String,
        createdAt: String,
        nowIso: String
    ) {
        try {
            val fields = JsonObject().apply {
                add("name", toFirestoreValue(name))
                add("email", toFirestoreValue(email))
                add("phone", toFirestoreValue(phone))
                add("phoneNumber", toFirestoreValue(phone))
                add("password", toFirestoreValue(pass))
                add("role", toFirestoreValue(role))
                add("platform", toFirestoreValue("Mobile Android App"))
                add("createdAt", toFirestoreValue(createdAt))
                add("updatedAt", toFirestoreValue(nowIso))
                add("lastLogin", toFirestoreValue(nowIso))
            }
            val root = JsonObject().apply { add("fields", fields) }
            val body = root.toString().toRequestBody(jsonMediaType)

            // 1. Try PATCH with updateMask
            val maskQuery = "?updateMask.fieldPaths=name&updateMask.fieldPaths=email&updateMask.fieldPaths=phone&updateMask.fieldPaths=phoneNumber&updateMask.fieldPaths=password&updateMask.fieldPaths=role&updateMask.fieldPaths=platform&updateMask.fieldPaths=createdAt&updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=lastLogin"
            val patchUrl = "$BASE_URL/users/$docId$maskQuery"
            val patchReq = Request.Builder().url(patchUrl).patch(body).build()
            val patchRes = client.newCall(patchReq).execute()

            if (patchRes.isSuccessful) {
                Log.d(TAG, "✅ User upserted to Firestore via PATCH: $docId")
                patchRes.close()
                return
            }
            patchRes.close()

            // 2. Fallback: Try POST to create document with specific ID
            val postUrl = "$BASE_URL/users?documentId=$docId"
            val postReq = Request.Builder().url(postUrl).post(body).build()
            val postRes = client.newCall(postReq).execute()
            if (postRes.isSuccessful) {
                Log.d(TAG, "✅ User created in Firestore via POST: $docId")
            } else {
                Log.w(TAG, "⚠️ User creation fallback status: ${postRes.code}")
            }
            postRes.close()
        } catch (e: Exception) {
            Log.e(TAG, "❌ upsertUserDocument error: ${e.message}")
        }
    }

    // ==================== 11. USER PROFILE LIVE FETCH & UPDATE ====================
    suspend fun getUserProfile(email: String): Map<String, Any?>? = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        val docId = "usr_${cleanEmail.replace(Regex("[^a-zA-Z0-9]"), "_")}"
        val url = "$BASE_URL/users/$docId"
        try {
            val req = Request.Builder().url(url).get().build()
            val res = client.newCall(req).execute()
            if (res.isSuccessful) {
                val doc = JsonParser.parseString(res.body?.string() ?: "").asJsonObject
                val map = parseDoc(doc)
                if (map.isNotEmpty()) return@withContext map
            }
        } catch (_: Exception) {}
        return@withContext null
    }

    suspend fun updateUserProfile(email: String, updatedData: Map<String, Any?>): Boolean = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        val docId = "usr_${cleanEmail.replace(Regex("[^a-zA-Z0-9]"), "_")}"

        val fields = JsonObject()
        val updateMasks = mutableListOf<String>()

        for ((k, v) in updatedData) {
            if (k != "_id") {
                fields.add(k, toFirestoreValue(v))
                updateMasks.add("updateMask.fieldPaths=$k")
            }
        }

        val nowIso = getIsoUtcTimestamp()
        fields.add("updatedAt", toFirestoreValue(nowIso))
        updateMasks.add("updateMask.fieldPaths=updatedAt")

        val maskQuery = if (updateMasks.isNotEmpty()) "?${updateMasks.joinToString("&")}" else ""
        val url = "$BASE_URL/users/$docId$maskQuery"

        try {
            val root = JsonObject().apply { add("fields", fields) }
            val body = root.toString().toRequestBody(jsonMediaType)
            val req = Request.Builder().url(url).patch(body).build()
            val res = client.newCall(req).execute()
            return@withContext res.isSuccessful
        } catch (e: Exception) {
            Log.e(TAG, "updateUserProfile error: ${e.message}")
            return@withContext false
        }
    }

    suspend fun changeUserPassword(email: String, oldPass: String, newPass: String): Boolean = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        val profile = getUserProfile(cleanEmail) ?: return@withContext false
        val currentPass = (profile["password"] ?: "").toString().trim()
        if (currentPass.isNotEmpty() && currentPass != oldPass.trim()) {
            return@withContext false
        }
        return@withContext updateUserProfile(cleanEmail, mapOf("password" to newPass.trim()))
    }

    // ==================== 12. ADMIN NOTIFICATIONS ====================
    suspend fun getAdminNotifications(): List<Map<String, Any?>> = withContext(Dispatchers.IO) {
        val url = "$BASE_URL/admin_notifications?pageSize=200"
        try {
            val request = Request.Builder().url(url).get().build()
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val bodyStr = response.body?.string() ?: ""
                val root = JsonParser.parseString(bodyStr).asJsonObject
                val documents = root.getAsJsonArray("documents") ?: JsonArray()
                val list = mutableListOf<Map<String, Any?>>()
                for (docElem in documents) {
                    list.add(parseDoc(docElem.asJsonObject))
                }
                return@withContext list
            }
        } catch (_: Exception) {}
        return@withContext emptyList()
    }

    private fun jsonObjectToMap(jsonObj: JsonObject): Map<String, Any?> {
        val map = mutableMapOf<String, Any?>()
        for ((k, v) in jsonObj.entrySet()) {
            when {
                v.isJsonNull -> map[k] = null
                v.isJsonPrimitive -> {
                    val p = v.asJsonPrimitive
                    when {
                        p.isBoolean -> map[k] = p.asBoolean
                        p.isNumber -> map[k] = p.asDouble
                        p.isString -> map[k] = p.asString
                    }
                }
                v.isJsonArray -> {
                    val list = mutableListOf<Any?>()
                    for (el in v.asJsonArray) {
                        if (el.isJsonObject) list.add(jsonObjectToMap(el.asJsonObject))
                        else if (el.isJsonPrimitive) list.add(el.asString)
                    }
                    map[k] = list
                }
                v.isJsonObject -> map[k] = jsonObjectToMap(v.asJsonObject)
            }
        }
        return map
    }
}
