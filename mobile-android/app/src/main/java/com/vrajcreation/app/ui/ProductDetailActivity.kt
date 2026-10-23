package com.vrajcreation.app.ui

import android.content.Intent
import android.graphics.Paint
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.vrajcreation.app.R
import com.vrajcreation.app.adapters.ProductAdapter
import com.vrajcreation.app.api.FirestoreService
import com.vrajcreation.app.data.CartManager
import com.vrajcreation.app.models.Product
import com.vrajcreation.app.utils.ImageHelper
import com.vrajcreation.app.utils.LuxuryToast
import kotlinx.coroutines.launch

class ProductDetailActivity : AppCompatActivity() {

    private lateinit var product: Product
    private var selectedSize = "S"
    private var selectedImageIndex = 0

    private lateinit var ivPrimary: ImageView
    private lateinit var rvThumbnails: RecyclerView
    private lateinit var tvCartBadge: TextView
    private lateinit var sizeButtons: List<TextView>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_product_detail)

        product = (intent.getSerializableExtra("product") as? Product) ?: run {
            finish()
            return
        }

        if (product.sizes.isNotEmpty()) {
            selectedSize = product.sizes.first()
        }

        setupViews()
        setupThumbnails()
        setupSizeSelector()
        loadRelatedProducts()
    }

    private fun setupViews() {
        ivPrimary = findViewById(R.id.ivDetailPrimary)
        rvThumbnails = findViewById(R.id.rvDetailThumbnails)
        val tvBrand = findViewById<TextView>(R.id.tvDetailBrand)
        val tvName = findViewById<TextView>(R.id.tvDetailName)
        val tvPrice = findViewById<TextView>(R.id.tvDetailPrice)
        val tvOldPrice = findViewById<TextView>(R.id.tvDetailOldPrice)
        val tvDiscount = findViewById<TextView>(R.id.tvDetailDiscount)
        val tvRating = findViewById<TextView>(R.id.tvDetailRating)
        val tvDesc = findViewById<TextView>(R.id.tvDetailDescription)
        tvCartBadge = findViewById(R.id.tvDetailCartBadge)

        findViewById<View>(R.id.btnBackDetail).setOnClickListener { finish() }
        findViewById<View>(R.id.btnCartDetail).setOnClickListener {
            startActivity(Intent(this, CartActivity::class.java))
        }

        tvBrand.text = product.brand.uppercase()
        tvName.text = product.name
        tvPrice.text = "₹${product.price.toInt()}"

        if (product.oldPrice > product.price && product.oldPrice > 0) {
            tvOldPrice.visibility = View.VISIBLE
            tvOldPrice.text = "₹${product.oldPrice.toInt()}"
            tvOldPrice.paintFlags = tvOldPrice.paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
        } else {
            tvOldPrice.visibility = View.GONE
        }

        if (product.discount > 0) {
            tvDiscount.visibility = View.VISIBLE
            tvDiscount.text = "${product.discount.toInt()}% OFF"
        } else {
            tvDiscount.visibility = View.GONE
        }

        tvRating.text = "★ ${product.rating} (${product.reviewsCount} Reviews)"
        tvDesc.text = if (product.description.isNotEmpty()) product.description else "Handcrafted luxury ethnic attire by Vraj Creation."

        ImageHelper.load(ivPrimary, product.primaryImage)

        findViewById<View>(R.id.btnAddToCart).setOnClickListener {
            CartManager.addToCart(product, size = selectedSize)
            updateCartBadge()
            LuxuryToast.showSuccess(this, "Added ${product.name} (Size: $selectedSize) to your bag.", "ADDED TO BAG")
        }

        findViewById<View>(R.id.btnBuyNow).setOnClickListener {
            CartManager.addToCart(product, size = selectedSize)
            startActivity(Intent(this, CartActivity::class.java))
        }

        CartManager.addListener { updateCartBadge() }
        updateCartBadge()
    }

    private fun setupThumbnails() {
        val images = product.images.filter { it.isNotEmpty() }
        if (images.size > 1) {
            rvThumbnails.visibility = View.VISIBLE
            rvThumbnails.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
            rvThumbnails.adapter = ThumbnailAdapter(images) { index, url ->
                selectedImageIndex = index
                ImageHelper.load(ivPrimary, url)
                rvThumbnails.adapter?.notifyDataSetChanged()
            }
        } else {
            rvThumbnails.visibility = View.GONE
        }
    }

    private fun setupSizeSelector() {
        val sS = findViewById<TextView>(R.id.sizeS)
        val sM = findViewById<TextView>(R.id.sizeM)
        val sL = findViewById<TextView>(R.id.sizeL)
        val sXL = findViewById<TextView>(R.id.sizeXL)
        val sXXL = findViewById<TextView>(R.id.sizeXXL)

        sizeButtons = listOf(sS, sM, sL, sXL, sXXL)

        for (btn in sizeButtons) {
            val sizeName = btn.text.toString()
            val isAvailable = product.sizes.isEmpty() || product.sizes.contains(sizeName)
            if (isAvailable) {
                btn.visibility = View.VISIBLE
                if (sizeName == selectedSize) {
                    btn.setBackgroundResource(R.drawable.bg_chip_selected)
                    btn.setTextColor(getColor(R.color.text_black))
                } else {
                    btn.setBackgroundResource(R.drawable.bg_chip_unselected)
                    btn.setTextColor(getColor(R.color.text_gray_light))
                }
            } else {
                btn.visibility = View.GONE
            }

            btn.setOnClickListener {
                selectedSize = btn.text.toString()
                for (b in sizeButtons) {
                    if (b == btn) {
                        b.setBackgroundResource(R.drawable.bg_chip_selected)
                        b.setTextColor(getColor(R.color.text_black))
                    } else {
                        b.setBackgroundResource(R.drawable.bg_chip_unselected)
                        b.setTextColor(getColor(R.color.text_gray_light))
                    }
                }
            }
        }
    }

    private fun updateCartBadge() {
        val count = CartManager.itemCount
        if (count > 0) {
            tvCartBadge.visibility = View.VISIBLE
            tvCartBadge.text = "$count"
        } else {
            tvCartBadge.visibility = View.GONE
        }
    }

    private fun loadRelatedProducts() {
        val rvRelated = findViewById<RecyclerView>(R.id.rvRelatedProducts)
        rvRelated.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)

        lifecycleScope.launch {
            try {
                val prods = FirestoreService.getProducts()
                val related = prods.filter { it.id != product.id && (it.category == product.category || it.subCategory == product.subCategory) }
                    .ifEmpty { prods.filter { it.id != product.id } }

                rvRelated.adapter = ProductAdapter(related, isHorizontal = true) { p ->
                    val intent = Intent(this@ProductDetailActivity, ProductDetailActivity::class.java)
                    intent.putExtra("product", p)
                    startActivity(intent)
                    finish()
                }
            } catch (_: Exception) {}
        }
    }

    inner class ThumbnailAdapter(
        private val images: List<String>,
        private val onThumbClick: (Int, String) -> Unit
    ) : RecyclerView.Adapter<ThumbnailAdapter.ThumbViewHolder>() {

        inner class ThumbViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val ivThumb: ImageView = view.findViewById(R.id.ivProduct)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ThumbViewHolder {
            val card = LayoutInflater.from(parent.context).inflate(R.layout.item_product, parent, false)
            val density = parent.context.resources.displayMetrics.density
            card.layoutParams = ViewGroup.LayoutParams((60 * density).toInt(), (74 * density).toInt())
            card.findViewById<View>(R.id.tvDiscountBadge)?.visibility = View.GONE
            card.findViewById<View>(R.id.tvCategory)?.visibility = View.GONE
            card.findViewById<View>(R.id.tvName)?.visibility = View.GONE
            card.findViewById<View>(R.id.tvRating)?.visibility = View.GONE
            card.findViewById<View>(R.id.tvPrice)?.visibility = View.GONE
            card.findViewById<View>(R.id.tvOldPrice)?.visibility = View.GONE
            return ThumbViewHolder(card)
        }

        override fun onBindViewHolder(holder: ThumbViewHolder, position: Int) {
            val url = images[position]
            ImageHelper.load(holder.ivThumb, url)

            if (position == selectedImageIndex) {
                holder.itemView.setBackgroundResource(R.drawable.bg_badge_gold)
            } else {
                holder.itemView.setBackgroundResource(R.drawable.bg_dark_card)
            }

            holder.itemView.setOnClickListener {
                onThumbClick(position, url)
            }
        }

        override fun getItemCount(): Int = images.size
    }
}
