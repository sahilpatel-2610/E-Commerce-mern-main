package com.vrajcreation.app.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.vrajcreation.app.R
import com.vrajcreation.app.models.AppNotificationItem
import com.vrajcreation.app.models.NotificationType
import java.text.SimpleDateFormat
import java.util.*

class NotificationAdapter(
    private var items: List<AppNotificationItem>,
    private val onNotificationClick: (AppNotificationItem) -> Unit
) : RecyclerView.Adapter<NotificationAdapter.NotificationViewHolder>() {

    fun updateData(newItems: List<AppNotificationItem>) {
        items = newItems
        notifyDataSetChanged()
    }

    class NotificationViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val ivIcon: ImageView = view.findViewById(R.id.ivNotifIcon)
        val tvTitle: TextView = view.findViewById(R.id.tvNotifTitle)
        val tvMessage: TextView = view.findViewById(R.id.tvNotifMessage)
        val tvTime: TextView = view.findViewById(R.id.tvNotifTime)
        val unreadDot: View = view.findViewById(R.id.vNotifUnreadDot)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): NotificationViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_notification, parent, false)
        return NotificationViewHolder(view)
    }

    override fun onBindViewHolder(holder: NotificationViewHolder, position: Int) {
        val item = items[position]

        holder.tvTitle.text = item.title
        holder.tvMessage.text = item.message
        
        val sdf = SimpleDateFormat("MMM dd, hh:mm a", Locale.getDefault())
        holder.tvTime.text = sdf.format(Date(item.timestamp))

        holder.unreadDot.visibility = if (item.isRead) View.GONE else View.VISIBLE

        holder.itemView.setOnClickListener {
            onNotificationClick(item)
        }
    }

    override fun getItemCount(): Int = items.size
}
