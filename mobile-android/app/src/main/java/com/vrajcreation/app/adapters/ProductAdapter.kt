package com.vrajcreation.app.adapters

import android.graphics.Paint
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.vrajcreation.app.R
import com.vrajcreation.app.models.Product
import com.vrajcreation.app.utils.ImageHelper

class ProductAdapter(
    private var products: List<Product>,
    private val isHorizontal: Boolean = false,
    private val onProductClick: (Product) -> Unit
) : RecyclerView.Adapter<ProductAdapter.ProductViewHolder>() {

    fun updateData(newProducts: List<Product>) {
        products = newProducts
        notifyDataSetChanged()
    }

    class ProductViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val ivProduct: ImageView = view.findViewById(R.id.ivProduct)
        val tvCategory: TextView = view.findViewById(R.id.tvCategory)
        val tvName: TextView = view.findViewById(R.id.tvName)
        val tvPrice: TextView = view.findViewById(R.id.tvPrice)
        val tvOldPrice: TextView = view.findViewById(R.id.tvOldPrice)
        val tvDiscountBadge: TextView = view.findViewById(R.id.tvDiscountBadge)
        val tvRating: TextView = view.findViewById(R.id.tvRating)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProductViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_product, parent, false)
        if (isHorizontal) {
            val displayMetrics = parent.context.resources.displayMetrics
            val screenWidth = displayMetrics.widthPixels
            val density = displayMetrics.density
            // Exact 2-card layout matching Flutter: (screenWidth - (32 + 12) * density) / 2
            val cardWidthPx = (((screenWidth - (32 + 12) * density) / 2).toInt()).coerceAtLeast((160 * density).toInt())
            val lp = RecyclerView.LayoutParams(cardWidthPx, ViewGroup.LayoutParams.WRAP_CONTENT)
            lp.setMargins((4 * density).toInt(), (4 * density).toInt(), (8 * density).toInt(), (8 * density).toInt())
            view.layoutParams = lp
        }
        return ProductViewHolder(view)
    }

    override fun onBindViewHolder(holder: ProductViewHolder, position: Int) {
        val product = products[position]

        holder.tvCategory.text = product.category.uppercase()
        holder.tvName.text = product.name
        holder.tvPrice.text = "₹${product.price.toInt()}"

        if (product.oldPrice > product.price && product.oldPrice > 0) {
            holder.tvOldPrice.visibility = View.VISIBLE
            holder.tvOldPrice.text = "₹${product.oldPrice.toInt()}"
            holder.tvOldPrice.paintFlags = holder.tvOldPrice.paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
        } else {
            holder.tvOldPrice.visibility = View.GONE
        }

        if (product.discount > 0) {
            holder.tvDiscountBadge.visibility = View.VISIBLE
            holder.tvDiscountBadge.text = "${product.discount.toInt()}% OFF"
        } else {
            holder.tvDiscountBadge.visibility = View.GONE
        }

        holder.tvRating.text = "${product.rating}"

        ImageHelper.load(holder.ivProduct, product.primaryImage)

        holder.itemView.setOnClickListener {
            onProductClick(product)
        }
    }

    override fun getItemCount(): Int = products.size
}
