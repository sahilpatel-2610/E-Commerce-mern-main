package com.vrajcreation.app.dialogs

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.vrajcreation.app.R
import com.vrajcreation.app.adapters.NotificationAdapter
import com.vrajcreation.app.models.NotificationType
import com.vrajcreation.app.services.NotificationService
import com.vrajcreation.app.ui.OrdersActivity

class NotificationBottomSheetDialog : BottomSheetDialogFragment() {

    private lateinit var rvNotifs: RecyclerView
    private lateinit var layoutEmpty: View
    private lateinit var btnMarkAllRead: TextView
    private lateinit var adapter: NotificationAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.dialog_notification_center, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        rvNotifs = view.findViewById(R.id.rvNotifications)
        layoutEmpty = view.findViewById(R.id.layoutEmptyNotifications)
        btnMarkAllRead = view.findViewById(R.id.btnMarkAllRead)

        view.findViewById<View>(R.id.btnCloseNotifModal)?.setOnClickListener {
            dismiss()
        }

        adapter = NotificationAdapter(NotificationService.notifications) { item ->
            NotificationService.markAsRead(item.id)
            dismiss()
            if (item.type == NotificationType.orderStatus) {
                startActivity(Intent(requireContext(), OrdersActivity::class.java))
            }
        }

        rvNotifs.layoutManager = LinearLayoutManager(requireContext())
        rvNotifs.adapter = adapter

        updateList()

        btnMarkAllRead.setOnClickListener {
            NotificationService.markAllAsRead()
            updateList()
        }
    }

    private fun updateList() {
        val list = NotificationService.notifications
        val unread = NotificationService.unreadCount
        adapter.updateData(list)

        btnMarkAllRead.visibility = if (unread > 0) View.VISIBLE else View.GONE

        if (list.isEmpty()) {
            layoutEmpty.visibility = View.VISIBLE
            rvNotifs.visibility = View.GONE
        } else {
            layoutEmpty.visibility = View.GONE
            rvNotifs.visibility = View.VISIBLE
        }
    }
}
