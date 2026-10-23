package com.vrajcreation.app.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.vrajcreation.app.R
import com.vrajcreation.app.models.CartItem
import com.vrajcreation.app.utils.ImageHelper

class CartAdapter(
    private var items: List<CartItem>,
    private val onQuantityChanged: (CartItem, Int) -> Unit,
    private val onDeleteItem: (CartItem) -> Unit
) : RecyclerView.Adapter<CartAdapter.CartViewHolder>() {

    fun updateData(newItems: List<CartItem>) {
        items = newItems
        notifyDataSetChanged()
    }

    class CartViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val ivProduct: ImageView = view.findViewById(R.id.ivCartProduct)
        val tvName: TextView = view.findViewById(R.id.tvCartItemName)
        val tvCategory: TextView = view.findViewById(R.id.tvCartItemCategory)
        val tvSize: TextView = view.findViewById(R.id.tvCartItemSize)
        val tvPrice: TextView = view.findViewById(R.id.tvCartItemPrice)
        val tvItemTotal: TextView = view.findViewById(R.id.tvCartItemTotal)
        val tvQuantity: TextView = view.findViewById(R.id.tvCartQuantity)
        val btnMinus: View = view.findViewById(R.id.btnCartMinus)
        val btnPlus: View = view.findViewById(R.id.btnCartPlus)
        val btnDelete: View = view.findViewById(R.id.btnCartDelete)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CartViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_cart, parent, false)
        return CartViewHolder(view)
    }

    override fun onBindViewHolder(holder: CartViewHolder, position: Int) {
        val item = items[position]
        holder.tvName.text = item.product.name
        holder.tvCategory.text = if (item.product.category.isNotEmpty()) item.product.category.uppercase() else "MENSWEAR"
        holder.tvSize.text = "Size: ${item.size}"
        holder.tvPrice.text = "Price: ₹${item.product.price.toInt()}"
        holder.tvQuantity.text = "${item.quantity}"
        holder.tvItemTotal.text = "₹${item.totalPrice.toInt()}.00"

        ImageHelper.load(holder.ivProduct, item.product.primaryImage)

        holder.btnMinus.setOnClickListener {
            onQuantityChanged(item, -1)
        }

        holder.btnPlus.setOnClickListener {
            onQuantityChanged(item, 1)
        }

        holder.btnDelete.setOnClickListener {
            onDeleteItem(item)
        }
    }

    override fun getItemCount(): Int = items.size
}
