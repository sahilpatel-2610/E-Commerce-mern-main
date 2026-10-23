package com.vrajcreation.app.data

import com.vrajcreation.app.models.CartItem
import com.vrajcreation.app.models.Product

object CartManager {
    private val _items = mutableListOf<CartItem>()
    private var _appliedCoupon: String = ""
    private var _discountPercentage: Double = 0.0
    private var _fixedDiscount: Double = 0.0

    private val listeners = mutableListOf<() -> Unit>()

    fun addListener(listener: () -> Unit) {
        if (!listeners.contains(listener)) {
            listeners.add(listener)
        }
    }

    fun removeListener(listener: () -> Unit) {
        listeners.remove(listener)
    }

    private fun notifyChanges() {
        listeners.forEach { it.invoke() }
    }

    val items: List<CartItem>
        get() = _items.toList()

    val itemCount: Int
        get() = _items.sumOf { it.quantity }

    val subtotal: Double
        get() = _items.sumOf { it.totalPrice }

    val deliveryFee: Double
        get() {
            if (_items.isEmpty()) return 0.0
            return if (subtotal >= 5000.0) 0.0 else 60.0
        }

    val appliedCoupon: String
        get() = _appliedCoupon

    val hasCoupon: Boolean
        get() = _appliedCoupon.isNotEmpty()

    val discountAmount: Double
        get() {
            if (_items.isEmpty()) return 0.0
            if (_discountPercentage > 0) {
                return (subtotal * _discountPercentage) / 100.0
            }
            if (_fixedDiscount > 0) {
                return if (_fixedDiscount > subtotal) subtotal else _fixedDiscount
            }
            return 0.0
        }

    val grandTotal: Double
        get() {
            if (_items.isEmpty()) return 0.0
            val total = subtotal + deliveryFee - discountAmount
            return if (total < 0.0) 0.0 else total
        }

    fun applyCoupon(code: String): Boolean {
        val clean = code.trim().uppercase()
        if (clean.isEmpty()) return false

        when (clean) {
            "WELCOME10", "VRAJ10" -> {
                _appliedCoupon = clean
                _discountPercentage = 10.0
                _fixedDiscount = 0.0
            }
            "VRAJ100", "FIRST100" -> {
                _appliedCoupon = clean
                _discountPercentage = 0.0
                _fixedDiscount = 100.0
            }
            "LUXURY20", "VIP20" -> {
                _appliedCoupon = clean
                _discountPercentage = 20.0
                _fixedDiscount = 0.0
            }
            "FESTIVE500", "WEDDING500" -> {
                _appliedCoupon = clean
                _discountPercentage = 0.0
                _fixedDiscount = 500.0
            }
            else -> {
                _appliedCoupon = clean
                _discountPercentage = 10.0
                _fixedDiscount = 0.0
            }
        }
        notifyChanges()
        return true
    }

    fun removeCoupon() {
        _appliedCoupon = ""
        _discountPercentage = 0.0
        _fixedDiscount = 0.0
        notifyChanges()
    }

    fun addToCart(product: Product, size: String = "Standard", color: String = "") {
        val existing = _items.find { it.product.id == product.id && it.size == size && it.color == color }
        if (existing != null) {
            existing.quantity += 1
        } else {
            _items.add(CartItem(product = product, size = size, color = color, quantity = 1))
        }
        notifyChanges()
    }

    fun updateQuantity(item: CartItem, delta: Int) {
        item.quantity += delta
        if (item.quantity <= 0) {
            _items.remove(item)
        }
        notifyChanges()
    }

    fun removeFromCart(item: CartItem) {
        _items.remove(item)
        notifyChanges()
    }

    fun clearCart() {
        _items.clear()
        _appliedCoupon = ""
        _discountPercentage = 0.0
        _fixedDiscount = 0.0
        notifyChanges()
    }
}
