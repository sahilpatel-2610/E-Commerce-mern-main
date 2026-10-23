package com.vrajcreation.app.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.vrajcreation.app.R

class CategoryChipAdapter(
    private val categories: List<String>,
    private var selectedIndex: Int = 0,
    private val onCategorySelected: (String, Int) -> Unit
) : RecyclerView.Adapter<CategoryChipAdapter.ChipViewHolder>() {

    fun setSelectedIndex(index: Int) {
        selectedIndex = index
        notifyDataSetChanged()
    }

    class ChipViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvChip: TextView = view.findViewById(R.id.tvFilterChip)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChipViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_filter_chip, parent, false)
        return ChipViewHolder(view)
    }

    override fun onBindViewHolder(holder: ChipViewHolder, position: Int) {
        val item = categories[position]
        val isSelected = position == selectedIndex

        holder.tvChip.text = item
        if (isSelected) {
            holder.tvChip.setBackgroundResource(R.drawable.bg_chip_selected)
            holder.tvChip.setTextColor(holder.itemView.context.getColor(R.color.text_black))
        } else {
            holder.tvChip.setBackgroundResource(R.drawable.bg_chip_unselected)
            holder.tvChip.setTextColor(holder.itemView.context.getColor(R.color.text_gray_light))
        }

        holder.itemView.setOnClickListener {
            selectedIndex = position
            notifyDataSetChanged()
            onCategorySelected(item, position)
        }
    }

    override fun getItemCount(): Int = categories.size
}
