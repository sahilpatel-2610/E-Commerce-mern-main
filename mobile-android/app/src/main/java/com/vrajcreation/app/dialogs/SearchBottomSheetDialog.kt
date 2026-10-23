package com.vrajcreation.app.dialogs

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.TextView
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.vrajcreation.app.R
import com.vrajcreation.app.adapters.ProductAdapter
import com.vrajcreation.app.models.Product
import com.vrajcreation.app.ui.MainActivity
import com.vrajcreation.app.ui.ProductDetailActivity

class SearchBottomSheetDialog(
    private val allProducts: List<Product>
) : BottomSheetDialogFragment() {

    private lateinit var etSearch: EditText
    private lateinit var btnClear: View
    private lateinit var tvCount: TextView
    private lateinit var rvResults: RecyclerView
    private lateinit var adapter: ProductAdapter
    private var currentQuery = ""

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.dialog_search, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        etSearch = view.findViewById(R.id.etSearchQuery)
        btnClear = view.findViewById(R.id.btnClearSearch)
        tvCount = view.findViewById(R.id.tvSearchResultsCount)
        rvResults = view.findViewById(R.id.rvSearchResults)

        view.findViewById<View>(R.id.btnCloseSearchModal)?.setOnClickListener {
            dismiss()
        }

        view.findViewById<View>(R.id.btnViewAllCollection)?.setOnClickListener {
            dismiss()
            val intent = Intent(requireContext(), MainActivity::class.java)
            intent.putExtra("selectedTab", "collection")
            intent.putExtra("searchQuery", currentQuery)
            startActivity(intent)
        }

        // Trending tags click handlers
        val tagIds = listOf(
            R.id.tagGurkha to "Gurkha Pant",
            R.id.tagKorean to "Korean Fit",
            R.id.tagFestive to "Festive Kurta",
            R.id.tagFormal to "Formal Shirt",
            R.id.tagCotton to "Cotton Pant",
            R.id.tagSuit to "Suit",
            R.id.tagBlazer to "Blazer",
            R.id.tagDenim to "Denim"
        )

        for ((id, tagText) in tagIds) {
            view.findViewById<View>(id)?.setOnClickListener {
                etSearch.setText(tagText)
                etSearch.setSelection(tagText.length)
            }
        }

        adapter = ProductAdapter(allProducts) { product ->
            dismiss()
            val intent = Intent(requireContext(), ProductDetailActivity::class.java)
            intent.putExtra("product", product)
            startActivity(intent)
        }

        rvResults.layoutManager = GridLayoutManager(requireContext(), 2)
        rvResults.adapter = adapter

        etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                currentQuery = s?.toString()?.trim() ?: ""
                btnClear.visibility = if (currentQuery.isNotEmpty()) View.VISIBLE else View.GONE
                filterResults(currentQuery.lowercase())
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        btnClear.setOnClickListener {
            etSearch.setText("")
        }

        filterResults("")
    }

    private fun filterResults(query: String) {
        if (query.isEmpty()) {
            adapter.updateData(allProducts)
            tvCount.text = "Popular Bespoke Garments (${allProducts.size})"
            return
        }

        val filtered = allProducts.filter {
            it.name.lowercase().contains(query) ||
                    it.category.lowercase().contains(query) ||
                    it.subCategory.lowercase().contains(query) ||
                    it.brand.lowercase().contains(query) ||
                    it.description.lowercase().contains(query)
        }
        adapter.updateData(filtered)
        tvCount.text = "Found ${filtered.size} matching items"
    }
}
