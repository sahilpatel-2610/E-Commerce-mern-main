package com.vrajcreation.app.ui

import android.content.Intent
import android.content.res.ColorStateList
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.vrajcreation.app.R
import com.vrajcreation.app.data.UserSession
import com.vrajcreation.app.models.AppNotificationItem
import com.vrajcreation.app.services.NotificationService
import com.vrajcreation.app.utils.LuxuryToast

class MainActivity : AppCompatActivity() {

    private lateinit var tabHome: FrameLayout
    private lateinit var tabCollection: FrameLayout
    private lateinit var tabAbout: FrameLayout
    private lateinit var tabContact: FrameLayout

    private lateinit var layoutTabHome: LinearLayout
    private lateinit var layoutTabCollection: LinearLayout
    private lateinit var layoutTabAbout: LinearLayout
    private lateinit var layoutTabContact: LinearLayout

    private lateinit var iconTabHome: ImageView
    private lateinit var iconTabCollection: ImageView
    private lateinit var iconTabAbout: ImageView
    private lateinit var iconTabContact: ImageView

    private lateinit var tvTabHome: TextView
    private lateinit var tvTabCollection: TextView
    private lateinit var tvTabAbout: TextView
    private lateinit var tvTabContact: TextView

    private lateinit var topNotificationSlot: FrameLayout

    private var currentTabIndex = 0
    private var backPressedTime = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Session check
        if (!UserSession.isLoggedIn(this)) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        setContentView(R.layout.activity_main)

        tabHome = findViewById(R.id.tabHome)
        tabCollection = findViewById(R.id.tabCollection)
        tabAbout = findViewById(R.id.tabAbout)
        tabContact = findViewById(R.id.tabContact)

        layoutTabHome = findViewById(R.id.layoutTabHome)
        layoutTabCollection = findViewById(R.id.layoutTabCollection)
        layoutTabAbout = findViewById(R.id.layoutTabAbout)
        layoutTabContact = findViewById(R.id.layoutTabContact)

        iconTabHome = findViewById(R.id.iconTabHome)
        iconTabCollection = findViewById(R.id.iconTabCollection)
        iconTabAbout = findViewById(R.id.iconTabAbout)
        iconTabContact = findViewById(R.id.iconTabContact)

        tvTabHome = findViewById(R.id.tvTabHome)
        tvTabCollection = findViewById(R.id.tvTabCollection)
        tvTabAbout = findViewById(R.id.tvTabAbout)
        tvTabContact = findViewById(R.id.tvTabContact)

        topNotificationSlot = findViewById(R.id.topNotificationSlot)

        // 2. Initialize live dynamic notification engine
        NotificationService.initialize(this)
        NotificationService.setBannerCallback { notif ->
            showTopNotificationBanner(notif)
        }

        tabHome.setOnClickListener { switchTab(0) }
        tabCollection.setOnClickListener { switchTab(1) }
        tabAbout.setOnClickListener { switchTab(2) }
        tabContact.setOnClickListener { switchTab(3) }

        if (savedInstanceState == null) {
            switchTab(0)
        }

        // Back press handling
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (currentTabIndex != 0) {
                    switchTab(0)
                } else {
                    val now = System.currentTimeMillis()
                    if (now - backPressedTime < 2000) {
                        finish()
                    } else {
                        backPressedTime = now
                        LuxuryToast.showInfo(this@MainActivity, "Press back again to exit Vraj Creation", "EXIT APP")
                    }
                }
            }
        })
    }

    fun switchTab(index: Int) {
        currentTabIndex = index
        resetTabStyles()

        // Dynamically expand the active tab to 1.8f weight so all letters fit with ZERO clipping!
        tabHome.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, if (index == 0) 1.8f else 0.8f)
        tabCollection.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, if (index == 1) 1.8f else 0.8f)
        tabAbout.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, if (index == 2) 1.8f else 0.8f)
        tabContact.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, if (index == 3) 1.8f else 0.8f)

        val fragment: Fragment = when (index) {
            0 -> {
                highlightTab(layoutTabHome, tvTabHome, iconTabHome, R.drawable.ic_nav_home_filled)
                HomeFragment()
            }
            1 -> {
                highlightTab(layoutTabCollection, tvTabCollection, iconTabCollection, R.drawable.ic_nav_collection_filled)
                CollectionFragment()
            }
            2 -> {
                highlightTab(layoutTabAbout, tvTabAbout, iconTabAbout, R.drawable.ic_nav_about_filled)
                AboutFragment()
            }
            3 -> {
                highlightTab(layoutTabContact, tvTabContact, iconTabContact, R.drawable.ic_nav_contact_filled)
                ContactFragment()
            }
            else -> HomeFragment()
        }

        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .commit()
    }

    private fun resetTabStyles() {
        val density = resources.displayMetrics.density
        val padH = (10 * density).toInt()
        val padV = (7 * density).toInt()
        val inactiveTint = ColorStateList.valueOf(0x99FFFFFF.toInt())

        // Tab 0: Home Outlined
        layoutTabHome.background = null
        layoutTabHome.setPadding(padH, padV, padH, padV)
        tvTabHome.visibility = View.GONE
        iconTabHome.setImageResource(R.drawable.ic_nav_home_outlined)
        iconTabHome.imageTintList = inactiveTint

        // Tab 1: Collection Outlined
        layoutTabCollection.background = null
        layoutTabCollection.setPadding(padH, padV, padH, padV)
        tvTabCollection.visibility = View.GONE
        iconTabCollection.setImageResource(R.drawable.ic_nav_collection_outlined)
        iconTabCollection.imageTintList = inactiveTint

        // Tab 2: About Outlined (info_outline)
        layoutTabAbout.background = null
        layoutTabAbout.setPadding(padH, padV, padH, padV)
        tvTabAbout.visibility = View.GONE
        iconTabAbout.setImageResource(R.drawable.ic_nav_about_outlined)
        iconTabAbout.imageTintList = inactiveTint

        // Tab 3: Contact Outlined (phone_in_talk_outlined)
        layoutTabContact.background = null
        layoutTabContact.setPadding(padH, padV, padH, padV)
        tvTabContact.visibility = View.GONE
        iconTabContact.setImageResource(R.drawable.ic_nav_contact_outlined)
        iconTabContact.imageTintList = inactiveTint
    }

    private fun highlightTab(layout: LinearLayout, tv: TextView, icon: ImageView, activeIconRes: Int) {
        val density = resources.displayMetrics.density
        val padH = (14 * density).toInt()
        val padV = (7 * density).toInt()

        layout.setBackgroundResource(R.drawable.bg_bottom_nav_tab_active)
        layout.setPadding(padH, padV, padH, padV)
        tv.visibility = View.VISIBLE
        tv.setTextColor(getColor(R.color.text_black))
        icon.setImageResource(activeIconRes)
        icon.imageTintList = ColorStateList.valueOf(0xFF000000.toInt())
    }

    private fun showTopNotificationBanner(item: AppNotificationItem) {
        runOnUiThread {
            topNotificationSlot.removeAllViews()
            val bannerView = LayoutInflater.from(this).inflate(R.layout.view_top_notification_banner, topNotificationSlot, false)

            val tvTitle = bannerView.findViewById<TextView>(R.id.tvTopBannerTitle)
            val tvMsg = bannerView.findViewById<TextView>(R.id.tvTopBannerMessage)
            val btnDismiss = bannerView.findViewById<TextView>(R.id.btnDismissTopBanner)

            tvTitle.text = item.title
            tvMsg.text = item.message

            topNotificationSlot.visibility = View.VISIBLE
            topNotificationSlot.addView(bannerView)

            btnDismiss.setOnClickListener {
                topNotificationSlot.visibility = View.GONE
                topNotificationSlot.removeAllViews()
            }

            bannerView.setOnClickListener {
                topNotificationSlot.visibility = View.GONE
                topNotificationSlot.removeAllViews()
                NotificationService.markAsRead(item.id)
                if (item.type.name.contains("order", ignoreCase = true)) {
                    startActivity(Intent(this, OrdersActivity::class.java))
                }
            }

            Handler(Looper.getMainLooper()).postDelayed({
                topNotificationSlot.visibility = View.GONE
                topNotificationSlot.removeAllViews()
            }, 5000)
        }
    }
}
