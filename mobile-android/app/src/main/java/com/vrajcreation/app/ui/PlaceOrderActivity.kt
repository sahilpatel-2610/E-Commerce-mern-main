package com.vrajcreation.app.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.RadioGroup
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.vrajcreation.app.R
import com.vrajcreation.app.api.FirestoreService
import com.vrajcreation.app.data.CartManager
import com.vrajcreation.app.data.UserSession
import com.vrajcreation.app.models.Order
import com.vrajcreation.app.models.OrderItem
import com.vrajcreation.app.utils.LuxuryToast
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class PlaceOrderActivity : AppCompatActivity() {

    private lateinit var etFullName: EditText
    private lateinit var etEmail: EditText
    private lateinit var etPhone: EditText
    private lateinit var etAddress: EditText
    private lateinit var etCity: EditText
    private lateinit var etState: EditText
    private lateinit var etPincode: EditText
    private lateinit var rgPayment: RadioGroup
    private lateinit var tvTotal: TextView
    private lateinit var btnConfirm: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_place_order)

        etFullName = findViewById(R.id.etOrderFullName)
        etEmail = findViewById(R.id.etOrderEmail)
        etPhone = findViewById(R.id.etOrderPhone)
        etAddress = findViewById(R.id.etOrderAddress)
        etCity = findViewById(R.id.etOrderCity)
        etState = findViewById(R.id.etOrderState)
        etPincode = findViewById(R.id.etOrderPincode)
        rgPayment = findViewById(R.id.rgPaymentMethod)
        tvTotal = findViewById(R.id.tvPlaceOrderTotal)
        btnConfirm = findViewById(R.id.btnConfirmOrder)

        findViewById<View>(R.id.btnBackPlaceOrder).setOnClickListener { finish() }

        // Prefill from user session
        val user = UserSession.getUser(this)
        if (user.name.isNotEmpty() && user.name != "Valued Patron") {
            etFullName.setText(user.name)
        }
        if (user.email.isNotEmpty()) {
            etEmail.setText(user.email)
        }
        if (user.phone.isNotEmpty()) {
            etPhone.setText(user.phone)
        }
        if (user.address.isNotEmpty()) etAddress.setText(user.address)
        if (user.city.isNotEmpty()) etCity.setText(user.city)
        if (user.state.isNotEmpty()) etState.setText(user.state)
        if (user.pincode.isNotEmpty()) etPincode.setText(user.pincode)

        val grandTotal = CartManager.grandTotal
        tvTotal.text = "₹${grandTotal.toInt()}"

        btnConfirm.setOnClickListener {
            handlePlaceOrder()
        }
    }

    private fun handlePlaceOrder() {
        val name = etFullName.text.toString().trim()
        val email = etEmail.text.toString().trim()
        val phone = etPhone.text.toString().trim()
        val address = etAddress.text.toString().trim()
        val city = etCity.text.toString().trim()
        val state = etState.text.toString().trim()
        val pincode = etPincode.text.toString().trim()

        if (name.isEmpty() || email.isEmpty() || phone.isEmpty() || address.isEmpty() || city.isEmpty() || pincode.isEmpty()) {
            LuxuryToast.showError(this, "Please complete all delivery address fields.")
            return
        }

        val isCod = rgPayment.checkedRadioButtonId == R.id.rbCod
        val paymentMethod = if (isCod) "Cash on Delivery" else "UPI / Net Banking"

        val orderItems = CartManager.items.map {
            OrderItem(
                productId = it.product.id,
                name = it.product.name,
                price = it.product.price,
                quantity = it.quantity,
                size = it.size,
                color = it.color,
                image = it.product.primaryImage
            )
        }

        val orderId = "ORD_${System.currentTimeMillis()}"
        val sdf = SimpleDateFormat("MMM dd, yyyy hh:mm a", Locale.getDefault())
        val dateStr = sdf.format(Date())

        val order = Order(
            id = orderId,
            orderId = orderId,
            customerName = name,
            customerEmail = email,
            phone = phone,
            address = address,
            city = city,
            state = state,
            pincode = pincode,
            amount = CartManager.grandTotal,
            status = "Order Placed",
            paymentMethod = paymentMethod,
            items = orderItems,
            createdAt = dateStr
        )

        // Save/update user session with latest name and address
        val currentUser = UserSession.getUser(this)
        val updatedUser = currentUser.copy(
            name = name,
            email = email,
            phone = phone,
            address = address,
            city = city,
            state = state,
            pincode = pincode
        )
        UserSession.saveUser(this, updatedUser)

        btnConfirm.isEnabled = false
        btnConfirm.text = "PLACING ORDER..."

        lifecycleScope.launch {
            val success = FirestoreService.placeOrder(order)
            if (success) {
                CartManager.clearCart()
                LuxuryToast.showSuccess(this@PlaceOrderActivity, "Your order has been confirmed successfully!", "ORDER PLACED")
                val intent = Intent(this@PlaceOrderActivity, OrdersActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP
                startActivity(intent)
                finish()
            } else {
                btnConfirm.isEnabled = true
                btnConfirm.text = "PLACE ORDER ➔"
                LuxuryToast.showError(this@PlaceOrderActivity, "Failed to place order. Please try again.")
            }
        }
    }
}
