package com.vrajcreation.app.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.vrajcreation.app.R
import com.vrajcreation.app.models.Order
import com.vrajcreation.app.utils.ImageHelper

class OrderAdapter(
    private var orders: List<Order>,
    private val onCopyOrderId: (Order) -> Unit,
    private val onInvoiceClick: (Order) -> Unit,
    private val onTrackClick: (Order) -> Unit
) : RecyclerView.Adapter<OrderAdapter.OrderViewHolder>() {

    fun updateData(newOrders: List<Order>) {
        orders = newOrders
        notifyDataSetChanged()
    }

    class OrderViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvOrderId: TextView = view.findViewById(R.id.tvOrderId)
        val tvPaymentMethod: TextView = view.findViewById(R.id.tvOrderPaymentMethod)
        val ivProduct: ImageView = view.findViewById(R.id.ivOrderProduct)
        val tvItemName: TextView = view.findViewById(R.id.tvOrderItemName)
        val tvPrice: TextView = view.findViewById(R.id.tvOrderPrice)
        val tvQty: TextView = view.findViewById(R.id.tvOrderQty)
        val tvSize: TextView = view.findViewById(R.id.tvOrderSize)
        val tvDate: TextView = view.findViewById(R.id.tvOrderDate)

        val stepNode1: TextView = view.findViewById(R.id.stepNode1)
        val stepDivider1: View = view.findViewById(R.id.stepDivider1)
        val stepNode2: TextView = view.findViewById(R.id.stepNode2)
        val stepDivider2: View = view.findViewById(R.id.stepDivider2)
        val stepNode3: TextView = view.findViewById(R.id.stepNode3)
        val stepDivider3: View = view.findViewById(R.id.stepDivider3)
        val stepNode4: TextView = view.findViewById(R.id.stepNode4)

        val tvStatusBadge: TextView = view.findViewById(R.id.tvOrderStatusBadge)
        val btnCopyOrderId: View = view.findViewById(R.id.btnCopyOrderId)
        val btnInvoice: View = view.findViewById(R.id.btnOrderInvoice)
        val btnTrack: View = view.findViewById(R.id.btnOrderTrack)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OrderViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_order, parent, false)
        return OrderViewHolder(view)
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

    override fun onBindViewHolder(holder: OrderViewHolder, position: Int) {
        val order = orders[position]
        val shortId = if (order.orderId.length > 12) order.orderId.substring(0, 12) else order.orderId

        holder.tvOrderId.text = "ORDER #${shortId.uppercase()}"
        holder.tvPaymentMethod.text = order.paymentMethod.ifEmpty { "COD" }

        val firstItem = order.items.firstOrNull()
        holder.tvItemName.text = firstItem?.name ?: "Luxury Bespoke Garment"
        holder.tvPrice.text = "₹${order.amount.toInt()}"
        holder.tvQty.text = "Qty: ${firstItem?.quantity ?: 1}"
        holder.tvSize.text = "Size: ${firstItem?.size ?: "M"}"
        holder.tvDate.text = "Date: ${order.createdAt.take(16)}"

        val imgUrl = firstItem?.image ?: ""
        ImageHelper.load(holder.ivProduct, imgUrl)

        // Status Level and Colors
        val level = getStatusLevel(order.status)
        holder.tvStatusBadge.text = order.status

        val context = holder.itemView.context
        when (level) {
            4 -> {
                holder.tvStatusBadge.setBackgroundResource(R.drawable.bg_badge_green)
                holder.tvStatusBadge.setTextColor(context.getColor(R.color.status_green))
            }
            3 -> {
                holder.tvStatusBadge.setBackgroundResource(R.drawable.bg_badge_discount)
                holder.tvStatusBadge.setTextColor(context.getColor(R.color.sky_blue))
            }
            2 -> {
                holder.tvStatusBadge.setBackgroundResource(R.drawable.bg_badge_discount)
                holder.tvStatusBadge.setTextColor(context.getColor(R.color.purple_light))
            }
            else -> {
                holder.tvStatusBadge.setBackgroundResource(R.drawable.bg_badge_gold)
                holder.tvStatusBadge.setTextColor(context.getColor(R.color.gold_light))
            }
        }

        // Stepper Visual Nodes
        val goldBg = R.drawable.bg_badge_gold
        val unselectedBg = R.drawable.bg_chip_unselected
        val goldColor = context.getColor(R.color.gold_primary)
        val darkColor = context.getColor(R.color.border_dark)

        holder.stepNode1.setBackgroundResource(if (level >= 1) goldBg else unselectedBg)
        holder.stepDivider1.setBackgroundColor(if (level >= 2) goldColor else darkColor)

        holder.stepNode2.setBackgroundResource(if (level >= 2) goldBg else unselectedBg)
        holder.stepDivider2.setBackgroundColor(if (level >= 3) goldColor else darkColor)

        holder.stepNode3.setBackgroundResource(if (level >= 3) goldBg else unselectedBg)
        holder.stepDivider3.setBackgroundColor(if (level >= 4) goldColor else darkColor)

        holder.stepNode4.setBackgroundResource(if (level >= 4) goldBg else unselectedBg)

        // Click handlers
        holder.btnCopyOrderId.setOnClickListener { onCopyOrderId(order) }
        holder.btnInvoice.setOnClickListener { onInvoiceClick(order) }
        holder.btnTrack.setOnClickListener { onTrackClick(order) }
    }

    override fun getItemCount(): Int = orders.size
}
