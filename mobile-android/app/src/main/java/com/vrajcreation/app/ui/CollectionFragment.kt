package com.vrajcreation.app.ui

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.vrajcreation.app.R
import com.vrajcreation.app.adapters.CategoryChipAdapter
import com.vrajcreation.app.adapters.ProductAdapter
import com.vrajcreation.app.api.FirestoreService
import com.vrajcreation.app.models.Product
import kotlinx.coroutines.launch

class CollectionFragment : Fragment() {

    private lateinit var etSearch: EditText
    private lateinit var btnClearSearch: TextView
    private lateinit var btnResetAll: TextView
    private lateinit var rvChips: RecyclerView
    private lateinit var rvProducts: RecyclerView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var tvCount: TextView
    private lateinit var btnSort: TextView
    private lateinit var tvEmpty: TextView

    private lateinit var productAdapter: ProductAdapter
    private var allProducts = listOf<Product>()
    private var displayedProducts = mutableListOf<Product>()
    private var categories = mutableListOf("ALL")
    private var selectedCategory = "ALL"
    private var sortIndex = 0
    private val sortOptions = listOf("RELEVANT", "PRICE: LOW TO HIGH ↑", "PRICE: HIGH TO LOW ↓", "TOP RATED ★")

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_collection, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        etSearch = view.findViewById(R.id.etCollectionSearch)
        btnClearSearch = view.findViewById(R.id.btnClearCollectionSearch)
        btnResetAll = view.findViewById(R.id.btnClearAllFilters)
        rvChips = view.findViewById(R.id.rvCategoryChips)
        rvProducts = view.findViewById(R.id.rvCollectionProducts)
        swipeRefresh = view.findViewById(R.id.swipeRefreshCollection)
        tvCount = view.findViewById(R.id.tvProductsCount)
        btnSort = view.findViewById(R.id.btnSortPrice)
        tvEmpty = view.findViewById(R.id.tvEmptyCollection)

        swipeRefresh.setColorSchemeColors(
            Color.parseColor("#F59E0B"),
            Color.parseColor("#FBBF24")
        )
        swipeRefresh.setProgressBackgroundColorSchemeColor(Color.parseColor("#18181B"))

        rvChips.layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
        rvProducts.layoutManager = GridLayoutManager(requireContext(), 2)

        productAdapter = ProductAdapter(emptyList()) { product ->
            val intent = Intent(requireContext(), ProductDetailActivity::class.java)
            intent.putExtra("product", product)
            startActivity(intent)
        }
        rvProducts.adapter = productAdapter

        etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val q = s?.toString()?.trim() ?: ""
                btnClearSearch.visibility = if (q.isNotEmpty()) View.VISIBLE else View.GONE
                btnResetAll.visibility = if (q.isNotEmpty() || selectedCategory != "ALL") View.VISIBLE else View.GONE
                applyFilterAndSort()
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        btnClearSearch.setOnClickListener {
            etSearch.setText("")
        }

        btnResetAll.setOnClickListener {
            etSearch.setText("")
            selectedCategory = "ALL"
            (rvChips.adapter as? CategoryChipAdapter)?.setSelectedIndex(0)
            btnResetAll.visibility = View.GONE
            applyFilterAndSort()
        }

        btnSort.setOnClickListener {
            sortIndex = (sortIndex + 1) % sortOptions.size
            btnSort.text = "SORT: ${sortOptions[sortIndex]} ⇅"
            applyFilterAndSort()
        }

        val btnRefresh = view.findViewById<View>(R.id.btnRefreshCollection)
        btnRefresh?.setOnClickListener {
            val anim = android.view.animation.RotateAnimation(
                0f, 360f,
                android.view.animation.Animation.RELATIVE_TO_SELF, 0.5f,
                android.view.animation.Animation.RELATIVE_TO_SELF, 0.5f
            ).apply {
                duration = 600
                interpolator = android.view.animation.AccelerateDecelerateInterpolator()
            }
            btnRefresh.startAnimation(anim)
            loadProducts()
        }

        swipeRefresh.setOnRefreshListener {
            loadProducts()
        }

        loadProducts()
    }

    private fun loadProducts() {
        swipeRefresh.isRefreshing = true
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                allProducts = FirestoreService.getProducts()
                val liveCats = FirestoreService.getCategories()

                // Extract Categories with item counts
                val categoryMap = mutableMapOf<String, Int>()

                // Populate categories from Firestore registry first
                for (catDoc in liveCats) {
                    val cName = (catDoc["name"] ?: catDoc["categoryName"] ?: catDoc["title"] ?: "").toString().trim()
                    if (cName.isNotEmpty()) {
                        categoryMap[cName] = 0
                    }
                }

                // Calculate product counts
                for (p in allProducts) {
                    if (p.category.isNotEmpty()) {
                        categoryMap[p.category] = (categoryMap[p.category] ?: 0) + 1
                    }
                }

                categories.clear()
                categories.add("ALL (${allProducts.size})")
                for ((cat, count) in categoryMap) {
                    categories.add("${cat.uppercase()} ($count)")
                }

                rvChips.adapter = CategoryChipAdapter(categories, 0) { chipLabel, _ ->
                    val cleanCat = chipLabel.substringBefore(" (").trim()
                    selectedCategory = cleanCat
                    btnResetAll.visibility = if (etSearch.text.isNotEmpty() || selectedCategory != "ALL") View.VISIBLE else View.GONE
                    applyFilterAndSort()
                }

                applyFilterAndSort()
            } catch (_: Exception) {
            } finally {
                swipeRefresh.isRefreshing = false
            }
        }
    }

    private fun applyFilterAndSort() {
        val query = etSearch.text.toString().trim().lowercase()

        var filtered = allProducts.filter { p ->
            val matchQuery = if (query.isEmpty()) true else {
                p.name.lowercase().contains(query) ||
                        p.category.lowercase().contains(query) ||
                        p.subCategory.lowercase().contains(query) ||
                        p.brand.lowercase().contains(query) ||
                        p.description.lowercase().contains(query)
            }

            val matchCat = if (selectedCategory == "ALL") true else {
                p.category.equals(selectedCategory, ignoreCase = true) ||
                        p.subCategory.equals(selectedCategory, ignoreCase = true)
            }

            matchQuery && matchCat
        }

        filtered = when (sortIndex) {
            1 -> filtered.sortedBy { it.price }
            2 -> filtered.sortedByDescending { it.price }
            3 -> filtered.sortedByDescending { it.rating }
            else -> filtered
        }

        displayedProducts.clear()
        displayedProducts.addAll(filtered)
        productAdapter.updateData(displayedProducts)

        tvCount.text = "Showing ${displayedProducts.size} royal creations"
        tvEmpty.visibility = if (displayedProducts.isEmpty()) View.VISIBLE else View.GONE
    }
}
