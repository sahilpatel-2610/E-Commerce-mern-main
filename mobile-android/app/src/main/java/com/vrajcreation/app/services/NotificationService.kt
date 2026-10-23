package com.vrajcreation.app.services

import android.content.Context
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.vrajcreation.app.api.FirestoreService
import com.vrajcreation.app.models.AppNotificationItem
import com.vrajcreation.app.models.NotificationType
import kotlinx.coroutines.*
import java.util.*

object NotificationService {
    private const val TAG = "NotificationService"
    private const val PREFS_NAME = "vraj_notifications_prefs"
    private const val KEY_READ_IDS = "read_notification_ids"

    private val _notifications = Collections.synchronizedList(mutableListOf<AppNotificationItem>())
    private val processedIds = Collections.synchronizedSet(mutableSetOf<String>())
    private var isBaselineReady = false

    private val listeners = mutableListOf<() -> Unit>()
    private var bannerCallback: ((AppNotificationItem) -> Unit)? = null
    private var appContext: Context? = null

    private var job: Job? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    val notifications: List<AppNotificationItem>
        get() = _notifications.toList()

    val unreadCount: Int
        get() = _notifications.count { !it.isRead }

    fun addListener(listener: () -> Unit) {
        if (!listeners.contains(listener)) {
            listeners.add(listener)
        }
    }

    fun removeListener(listener: () -> Unit) {
        listeners.remove(listener)
    }

    fun setBannerCallback(callback: ((AppNotificationItem) -> Unit)?) {
        bannerCallback = callback
    }

    private fun notifyChanges() {
        Handler(Looper.getMainLooper()).post {
            listeners.forEach { it.invoke() }
        }
    }

    private fun getPrefs(): SharedPreferences? {
        return appContext?.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun getSavedReadIds(): MutableSet<String> {
        val set = getPrefs()?.getStringSet(KEY_READ_IDS, emptySet()) ?: emptySet()
        return set.toMutableSet()
    }

    private fun persistReadId(id: String) {
        val prefs = getPrefs() ?: return
        val current = getSavedReadIds()
        current.add(id)
        prefs.edit().putStringSet(KEY_READ_IDS, current).apply()
    }

    fun initialize(context: Context) {
        appContext = context.applicationContext
        processedIds.clear()
        _notifications.clear()
        startPolling()
    }

    private fun startPolling() {
        job?.cancel()
        job = scope.launch {
            val savedReadSet = getSavedReadIds()

            // 1. Initial Baseline Sync
            try {
                val initialList = FirestoreService.getAdminNotifications()
                for (doc in initialList) {
                    val id = doc["_id"]?.toString() ?: doc["id"]?.toString() ?: ""
                    if (id.isNotEmpty()) {
                        processedIds.add(id)
                        val title = doc["title"]?.toString() ?: "📢 VRAJ CREATION UPDATE"
                        val message = doc["message"]?.toString() ?: doc["body"]?.toString() ?: "New update from Admin."
                        val typeStr = doc["type"]?.toString() ?: "adminBroadcast"
                        val type = when (typeStr) {
                            "product" -> if (title.contains("DROP") || title.contains("ADDED")) NotificationType.productAdded else NotificationType.productUpdated
                            "category", "subcategory" -> NotificationType.categoryUpdated
                            "order" -> NotificationType.orderStatus
                            "banner" -> NotificationType.bannerDrop
                            else -> NotificationType.adminBroadcast
                        }
                        val fullId = "admin_$id"
                        val isAlreadyRead = savedReadSet.contains(fullId)

                        if (_notifications.none { it.id == fullId }) {
                            val notif = AppNotificationItem(
                                id = fullId,
                                title = title,
                                message = message,
                                type = type,
                                timestamp = System.currentTimeMillis(),
                                data = doc,
                                isRead = isAlreadyRead
                            )
                            _notifications.add(notif)
                        }
                    }
                }
                isBaselineReady = true
                notifyChanges()
            } catch (_: Exception) {
                isBaselineReady = true
            }

            // 2. Periodic Polling (30s interval)
            while (isActive) {
                delay(30000)
                try {
                    checkAdminBroadcasts()
                } catch (e: Exception) {
                    Log.e(TAG, "Polling error: ${e.message}")
                }
            }
        }
    }

    private suspend fun checkAdminBroadcasts() {
        val docs = FirestoreService.getAdminNotifications()
        val savedReadSet = getSavedReadIds()

        for (parsed in docs) {
            val id = parsed["_id"]?.toString() ?: parsed["id"]?.toString() ?: ""
            if (id.isEmpty()) continue

            if (!processedIds.contains(id)) {
                processedIds.add(id)

                if (isBaselineReady) {
                    val title = parsed["title"]?.toString() ?: "📢 VRAJ CREATION UPDATE"
                    val message = parsed["message"]?.toString() ?: parsed["body"]?.toString() ?: "New update from Admin."
                    val typeStr = parsed["type"]?.toString() ?: "adminBroadcast"

                    val type = when (typeStr) {
                        "product" -> if (title.contains("DROP") || title.contains("ADDED")) NotificationType.productAdded else NotificationType.productUpdated
                        "category", "subcategory" -> NotificationType.categoryUpdated
                        "order" -> NotificationType.orderStatus
                        "banner" -> NotificationType.bannerDrop
                        else -> NotificationType.adminBroadcast
                    }

                    val fullId = "admin_$id"
                    val isAlreadyRead = savedReadSet.contains(fullId)

                    if (_notifications.none { it.id == fullId }) {
                        val notif = AppNotificationItem(
                            id = fullId,
                            title = title,
                            message = message,
                            type = type,
                            timestamp = System.currentTimeMillis(),
                            data = parsed,
                            isRead = isAlreadyRead
                        )

                        _notifications.add(0, notif)
                        if (_notifications.size > 50) {
                            _notifications.removeAt(_notifications.size - 1)
                        }

                        notifyChanges()

                        if (!isAlreadyRead) {
                            Handler(Looper.getMainLooper()).post {
                                bannerCallback?.invoke(notif)
                            }
                        }
                    }
                }
            }
        }
    }

    fun markAsRead(id: String) {
        _notifications.find { it.id == id }?.isRead = true
        persistReadId(id)
        notifyChanges()
    }

    fun markAllAsRead() {
        val prefs = getPrefs()
        val allIds = getSavedReadIds()
        _notifications.forEach {
            it.isRead = true
            allIds.add(it.id)
        }
        prefs?.edit()?.putStringSet(KEY_READ_IDS, allIds)?.apply()
        notifyChanges()
    }

    fun clearAll() {
        _notifications.clear()
        notifyChanges()
    }
}
