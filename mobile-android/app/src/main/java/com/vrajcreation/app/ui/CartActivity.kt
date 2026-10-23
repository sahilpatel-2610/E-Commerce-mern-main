package com.vrajcreation.app.ui

import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.vrajcreation.app.R
import com.vrajcreation.app.adapters.CartAdapter
import com.vrajcreation.app.data.CartManager
import com.vrajcreation.app.utils.LuxuryToast

class CartActivity : AppCompatActivity() {

    private lateinit var rvCart: RecyclerView
    private lateinit var cartAdapter: CartAdapter
    private lateinit var tvTopTitle: TextView
    private lateinit var tvCountBadge: TextView
    private lateinit var tvSubtotal: TextView
    private lateinit var tvDiscount: TextView
    private lateinit var tvDelivery: TextView
    private lateinit var tvGrandTotal: TextView
    private lateinit var tvCouponNotice: TextView
    private lateinit var etCoupon: EditText
    private lateinit var layoutDiscountRow: View
    private lateinit var layoutEmptyCart: View
    private lateinit var scrollCart: View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_cart)

        rvCart = findViewById(R.id.rvCartItems)
        tvTopTitle = findViewById(R.id.tvCartTopTitle)
        tvCountBadge = findViewById(R.id.tvCartCountBadge)
        tvSubtotal = findViewById(R.id.tvCartSubtotal)
        tvDiscount = findViewById(R.id.tvCartDiscount)
        tvDelivery = findViewById(R.id.tvCartDeliveryFee)
        tvGrandTotal = findViewById(R.id.tvCartGrandTotal)
        tvCouponNotice = findViewById(R.id.tvAppliedCouponNotice)
        etCoupon = findViewById(R.id.etCouponCode)
        layoutDiscountRow = findViewById(R.id.layoutDiscountRow)
        layoutEmptyCart = findViewById(R.id.layoutEmptyCart)
        scrollCart = findViewById(R.id.scrollCart)

        findViewById<View>(R.id.btnBackCart).setOnClickListener { finish() }

        findViewById<View>(R.id.btnClearCart).setOnClickListener {
            if (CartManager.items.isEmpty()) return@setOnClickListener

            AlertDialog.Builder(this)
                .setTitle("Clear Shopping Bag?")
                .setMessage("Are you sure you want to remove all items from your bag?")
                .setPositiveButton("CLEAR ALL") { _, _ ->
                    CartManager.clearCart()
                    LuxuryToast.showInfo(this, "Shopping bag cleared.", "BAG CLEARED")
                    refreshCartUi()
                }
                .setNegativeButton("CANCEL", null)
                .show()
        }

        findViewById<View>(R.id.btnEmptyExplore).setOnClickListener {
            finish()
        }

        findViewById<View>(R.id.btnApplyCoupon).setOnClickListener {
            val code = etCoupon.text.toString().trim()
            if (code.isEmpty()) {
                LuxuryToast.showError(this, "Please enter a valid coupon code.", "PROMO CODE")
                return@setOnClickListener
            }
            val ok = CartManager.applyCoupon(code)
            if (ok) {
                LuxuryToast.showSuccess(this, "✨ Coupon '$code' applied successfully!", "COUPON APPLIED")
                refreshCartUi()
            } else {
                LuxuryToast.showError(this, "Invalid coupon code. Try WELCOME10 or VRAJ100.", "INVALID COUPON")
            }
        }

        findViewById<View>(R.id.btnProceedCheckout).setOnClickListener {
            if (CartManager.items.isEmpty()) {
                LuxuryToast.showError(this, "Your bag is empty.")
                return@setOnClickListener
            }
            startActivity(Intent(this, PlaceOrderActivity::class.java))
        }

        cartAdapter = CartAdapter(
            CartManager.items,
            onQuantityChanged = { item, delta ->
                CartManager.updateQuantity(item, delta)
                refreshCartUi()
            },
            onDeleteItem = { item ->
                CartManager.removeFromCart(item)
                LuxuryToast.showInfo(this, "Item removed from bag.", "REMOVED")
                refreshCartUi()
            }
        )

        rvCart.layoutManager = LinearLayoutManager(this)
        rvCart.adapter = cartAdapter

        refreshCartUi()
    }

    private fun refreshCartUi() {
        val items = CartManager.items
        val count = CartManager.itemCount

        if (items.isEmpty()) {
            layoutEmptyCart.visibility = View.VISIBLE
            scrollCart.visibility = View.GONE
            findViewById<View>(R.id.btnClearCart).visibility = View.GONE
            return
        }

        layoutEmptyCart.visibility = View.GONE
        scrollCart.visibility = View.VISIBLE
        findViewById<View>(R.id.btnClearCart).visibility = View.VISIBLE

        tvCountBadge.text = "$count ${if (count == 1) "Item" else "Items"}"
        cartAdapter.updateData(items)

        val subtotal = CartManager.subtotal
        val discount = CartManager.discountAmount
        val delivery = CartManager.deliveryFee
        val grandTotal = CartManager.grandTotal

        tvSubtotal.text = "₹${subtotal.toInt()}.00"
        tvGrandTotal.text = "₹${grandTotal.toInt()}.00"

        if (delivery == 0.0) {
            tvDelivery.text = "FREE"
            tvDelivery.setTextColor(getColor(R.color.status_green))
        } else {
            tvDelivery.text = "₹${delivery.toInt()}.00"
            tvDelivery.setTextColor(getColor(R.color.gold_light))
        }

        if (discount > 0.0) {
            layoutDiscountRow.visibility = View.VISIBLE
            tvDiscount.text = "-₹${discount.toInt()}.00"
            tvCouponNotice.visibility = View.VISIBLE
            tvCouponNotice.text = "✓ Coupon '${CartManager.appliedCoupon}' applied! (-₹${discount.toInt()})"
        } else {
            layoutDiscountRow.visibility = View.GONE
            tvCouponNotice.visibility = View.GONE
        }
    }
}
