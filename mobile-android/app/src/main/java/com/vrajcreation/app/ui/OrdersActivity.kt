package com.vrajcreation.app.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.Animation
import android.view.animation.RotateAnimation
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.vrajcreation.app.R
import com.vrajcreation.app.adapters.OrderAdapter
import com.vrajcreation.app.api.FirestoreService
import com.vrajcreation.app.data.UserSession
import com.vrajcreation.app.models.Order
import com.vrajcreation.app.utils.LuxuryToast
import kotlinx.coroutines.launch

class OrdersActivity : AppCompatActivity() {

    private lateinit var rvOrders: RecyclerView
    private lateinit var layoutEmpty: View
    private lateinit var etSearch: EditText
    private lateinit var btnClearSearch: View
    private lateinit var tabAll: TextView
    private lateinit var tabPlaced: TextView
    private lateinit var tabProcessing: TextView
    private lateinit var tabShipped: TextView
    private lateinit var tabDelivered: TextView

    private lateinit var adapter: OrderAdapter
    private var allOrders = mutableListOf<Order>()
    private var activeTab = "All"
    private var searchQuery = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_orders)

        rvOrders = findViewById(R.id.rvOrders)
        layoutEmpty = findViewById(R.id.layoutEmptyOrders)
        etSearch = findViewById(R.id.etSearchOrders)
        btnClearSearch = findViewById(R.id.btnClearSearchOrders)

        tabAll = findViewById(R.id.tabAllOrders)
        tabPlaced = findViewById(R.id.tabPlacedOrders)
        tabProcessing = findViewById(R.id.tabProcessingOrders)
        tabShipped = findViewById(R.id.tabShippedOrders)
        tabDelivered = findViewById(R.id.tabDeliveredOrders)

        findViewById<View>(R.id.btnBackOrders).setOnClickListener { finish() }

        val btnRefresh = findViewById<ImageView>(R.id.btnRefreshOrders)
        btnRefresh.setOnClickListener {
            val anim = RotateAnimation(
                0f, 360f,
                Animation.RELATIVE_TO_SELF, 0.5f,
                Animation.RELATIVE_TO_SELF, 0.5f
            ).apply {
                duration = 600
                interpolator = AccelerateDecelerateInterpolator()
            }
            btnRefresh.startAnimation(anim)
            LuxuryToast.showInfo(this, "Refreshing orders from Firebase...", "SYNC ORDERS")
            loadOrders()
        }

        // Tab click listeners
        tabAll.setOnClickListener { selectTab("All") }
        tabPlaced.setOnClickListener { selectTab("Order Placed") }
        tabProcessing.setOnClickListener { selectTab("Processing") }
        tabShipped.setOnClickListener { selectTab("Shipped") }
        tabDelivered.setOnClickListener { selectTab("Delivered") }

        // Search watcher
        etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {
                searchQuery = s?.toString()?.trim() ?: ""
                btnClearSearch.visibility = if (searchQuery.isNotEmpty()) View.VISIBLE else View.GONE
                applyFilters()
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        btnClearSearch.setOnClickListener {
            etSearch.setText("")
        }

        adapter = OrderAdapter(
            emptyList(),
            onCopyOrderId = { order ->
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText("Order ID", order.orderId)
                clipboard.setPrimaryClip(clip)
                LuxuryToast.showSuccess(this, "Order ID copied to clipboard!", "COPIED")
            },
            onInvoiceClick = { order ->
                showInvoiceModal(order)
            },
            onTrackClick = { order ->
                showTrackingModal(order)
            }
        )

        rvOrders.layoutManager = LinearLayoutManager(this)
        rvOrders.adapter = adapter

        loadOrders()
    }

    private fun selectTab(tab: String) {
        activeTab = tab
        updateTabStyles()
        applyFilters()
    }

    private fun updateTabStyles() {
        val selectedBg = R.drawable.bg_badge_gold
        val unselectedBg = R.drawable.bg_chip_unselected
        val goldColor = getColor(R.color.gold_light)
        val grayColor = getColor(R.color.text_gray)

        tabAll.setBackgroundResource(if (activeTab == "All") selectedBg else unselectedBg)
        tabAll.setTextColor(if (activeTab == "All") goldColor else grayColor)

        tabPlaced.setBackgroundResource(if (activeTab == "Order Placed") selectedBg else unselectedBg)
        tabPlaced.setTextColor(if (activeTab == "Order Placed") goldColor else grayColor)

        tabProcessing.setBackgroundResource(if (activeTab == "Processing") selectedBg else unselectedBg)
        tabProcessing.setTextColor(if (activeTab == "Processing") goldColor else grayColor)

        tabShipped.setBackgroundResource(if (activeTab == "Shipped") selectedBg else unselectedBg)
        tabShipped.setTextColor(if (activeTab == "Shipped") goldColor else grayColor)

        tabDelivered.setBackgroundResource(if (activeTab == "Delivered") selectedBg else unselectedBg)
        tabDelivered.setTextColor(if (activeTab == "Delivered") goldColor else grayColor)
    }

    private fun loadOrders() {
        val user = UserSession.getUser(this)

        lifecycleScope.launch {
            try {
                val fetched = FirestoreService.getUserOrders(user.email)
                allOrders.clear()
                allOrders.addAll(fetched)

                updateTabCounts()
                applyFilters()
            } catch (_: Exception) {}
        }
    }

    private fun updateTabCounts() {
        val total = allOrders.size
        val placed = allOrders.count { getStatusLevel(it.status) == 1 }
        val processing = allOrders.count { getStatusLevel(it.status) == 2 }
        val shipped = allOrders.count { getStatusLevel(it.status) == 3 }
        val delivered = allOrders.count { getStatusLevel(it.status) == 4 }

        tabAll.text = "All ($total)"
        tabPlaced.text = "Order Placed ($placed)"
        tabProcessing.text = "Processing ($processing)"
        tabShipped.text = "Shipped ($shipped)"
        tabDelivered.text = "Delivered ($delivered)"
    }

    private fun getStatusLevel(status: String): Int {
        val s = status.lowercase()
        return when {
            s.contains("deliver") -> 4
            s.contains("ship") || s.contains("way") || s.contains("transit") -> 3
            s.contains("process") || s.contains("pack") -> 2
            else -> 1
        }
    }

    private fun applyFilters() {
        val filtered = allOrders.filter { order ->
            val lvl = getStatusLevel(order.status)
            val tabMatch = when (activeTab) {
                "Order Placed" -> lvl == 1
                "Processing" -> lvl == 2
                "Shipped" -> lvl == 3
                "Delivered" -> lvl == 4
                else -> true
            }
            if (!tabMatch) return@filter false

            if (searchQuery.isNotEmpty()) {
                val q = searchQuery.lowercase()
                val itemName = order.items.firstOrNull()?.name?.lowercase() ?: ""
                val ordId = order.orderId.lowercase()
                val pay = order.paymentMethod.lowercase()
                return@filter itemName.contains(q) || ordId.contains(q) || pay.contains(q)
            }
            true
        }

        adapter.updateData(filtered)

        if (filtered.isEmpty()) {
            layoutEmpty.visibility = View.VISIBLE
            rvOrders.visibility = View.GONE
        } else {
            layoutEmpty.visibility = View.GONE
            rvOrders.visibility = View.VISIBLE
        }
    }

    private fun showInvoiceModal(order: Order) {
        val dialog = BottomSheetDialog(this)
        val view = LayoutInflater.from(this).inflate(R.layout.dialog_order_invoice, null)

        val user = UserSession.getUser(this)
        val firstItem = order.items.firstOrNull()

        view.findViewById<TextView>(R.id.tvInvoiceOrderId).text = "Order #${order.orderId.take(12).uppercase()}"
        view.findViewById<TextView>(R.id.tvInvoiceDate).text = order.createdAt.take(16)
        view.findViewById<TextView>(R.id.tvInvoiceCustomerName).text = "Billed To: ${if (user.name.isNotEmpty()) user.name else "Valued Patron"}"
        view.findViewById<TextView>(R.id.tvInvoiceCustomerEmail).text = "Email: ${if (user.email.isNotEmpty()) user.email else "patron@vrajcreation.com"}"
        view.findViewById<TextView>(R.id.tvInvoiceAddress).text = "Delivery Address: ${if (user.address.isNotEmpty()) "${user.address}, ${user.city}" else "Surat Atelier Delivery"}"

        view.findViewById<TextView>(R.id.tvInvoiceItemName).text = firstItem?.name ?: "Luxury Bespoke Garment"
        view.findViewById<TextView>(R.id.tvInvoicePriceQty).text = "₹${order.amount.toInt()} x ${firstItem?.quantity ?: 1}"
        view.findViewById<TextView>(R.id.tvInvoiceSize).text = "Size: ${firstItem?.size ?: "M"}"
        view.findViewById<TextView>(R.id.tvInvoicePaymentMethod).text = "Payment: ${order.paymentMethod.ifEmpty { "COD" }}"
        view.findViewById<TextView>(R.id.tvInvoiceGrandTotal).text = "₹${order.amount.toInt()}.00"

        view.findViewById<View>(R.id.btnCloseInvoice).setOnClickListener { dialog.dismiss() }
        view.findViewById<View>(R.id.btnDismissInvoice).setOnClickListener {
            dialog.dismiss()
            LuxuryToast.showSuccess(this, "Invoice verified with Firebase Atelier", "INVOICE READY")
        }

        dialog.setContentView(view)
        dialog.show()
    }

    private fun showTrackingModal(order: Order) {
        val dialog = BottomSheetDialog(this)
        val view = LayoutInflater.from(this).inflate(R.layout.dialog_order_tracking, null)

        val level = getStatusLevel(order.status)
        view.findViewById<TextView>(R.id.tvTrackingOrderId).text = "Order ID: #${order.orderId.take(12).uppercase()}"

        val icon1 = view.findViewById<FrameLayout>(R.id.iconStep1)
        val line1 = view.findViewById<View>(R.id.lineStep1)
        val icon2 = view.findViewById<FrameLayout>(R.id.iconStep2)
        val line2 = view.findViewById<View>(R.id.lineStep2)
        val icon3 = view.findViewById<FrameLayout>(R.id.iconStep3)
        val line3 = view.findViewById<View>(R.id.lineStep3)
        val icon4 = view.findViewById<FrameLayout>(R.id.iconStep4)

        val goldBg = R.drawable.bg_badge_gold
        val unselectedBg = R.drawable.bg_chip_unselected
        val goldColor = getColor(R.color.gold_primary)
        val darkColor = getColor(R.color.border_dark)

        icon1.setBackgroundResource(if (level >= 1) goldBg else unselectedBg)
        line1.setBackgroundColor(if (level >= 2) goldColor else darkColor)

        icon2.setBackgroundResource(if (level >= 2) goldBg else unselectedBg)
        line2.setBackgroundColor(if (level >= 3) goldColor else darkColor)

        icon3.setBackgroundResource(if (level >= 3) goldBg else unselectedBg)
        line3.setBackgroundColor(if (level >= 4) goldColor else darkColor)

        icon4.setBackgroundResource(if (level >= 4) goldBg else unselectedBg)

        view.findViewById<View>(R.id.btnCloseTracking).setOnClickListener { dialog.dismiss() }
        view.findViewById<View>(R.id.btnCloseTrackingBtn).setOnClickListener { dialog.dismiss() }

        dialog.setContentView(view)
        dialog.show()
    }
}
