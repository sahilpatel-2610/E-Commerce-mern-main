package com.vrajcreation.app.ui

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.TextView
import androidx.core.widget.NestedScrollView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.viewpager2.widget.ViewPager2
import com.vrajcreation.app.R
import com.vrajcreation.app.adapters.BannerPagerAdapter
import com.vrajcreation.app.adapters.ProductAdapter
import com.vrajcreation.app.api.FirestoreService
import com.vrajcreation.app.data.CartManager
import com.vrajcreation.app.dialogs.AccountBottomSheetDialog
import com.vrajcreation.app.dialogs.NotificationBottomSheetDialog
import com.vrajcreation.app.dialogs.SearchBottomSheetDialog
import com.vrajcreation.app.models.HomeBanner
import com.vrajcreation.app.models.Product
import com.vrajcreation.app.services.NotificationService
import com.vrajcreation.app.utils.LuxuryToast
import kotlinx.coroutines.launch

class HomeFragment : Fragment() {

    private lateinit var vpBanners: ViewPager2
    private lateinit var rvLatestLine1: RecyclerView
    private lateinit var rvLatestLine2: RecyclerView
    private lateinit var rvBestSellers: RecyclerView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var scrollHome: NestedScrollView
    private lateinit var tvCartBadge: TextView
    private lateinit var tvNotifBadge: TextView
    private lateinit var etNewsletter: EditText

    private var allProducts = listOf<Product>()
    private var bannersList = listOf<HomeBanner>()

    private val bannerHandler = Handler(Looper.getMainLooper())
    private val bannerRunnable = Runnable {
        if (bannersList.isNotEmpty() && ::vpBanners.isInitialized) {
            val nextItem = (vpBanners.currentItem + 1) % bannersList.size
            vpBanners.setCurrentItem(nextItem, true)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_home, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        vpBanners = view.findViewById(R.id.vpHomeBanners)
        rvLatestLine1 = view.findViewById(R.id.rvLatestLine1)
        rvLatestLine2 = view.findViewById(R.id.rvLatestLine2)
        rvBestSellers = view.findViewById(R.id.rvBestSellers)
        swipeRefresh = view.findViewById(R.id.swipeRefreshHome)
        scrollHome = view.findViewById(R.id.scrollHome)
        tvCartBadge = view.findViewById(R.id.tvHeaderCartBadge)
        tvNotifBadge = view.findViewById(R.id.tvHeaderNotifBadge)
        etNewsletter = view.findViewById(R.id.etNewsletterEmail)

        swipeRefresh.setColorSchemeColors(
            Color.parseColor("#F59E0B"),
            Color.parseColor("#FBBF24")
        )
        swipeRefresh.setProgressBackgroundColorSchemeColor(Color.parseColor("#18181B"))

        rvLatestLine1.layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
        rvLatestLine2.layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
        rvBestSellers.layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)

        setupHeaderActions(view)
        loadData()

        swipeRefresh.setOnRefreshListener {
            loadData()
        }

        view.findViewById<View>(R.id.btnExploreWholesale).setOnClickListener {
            (activity as? MainActivity)?.switchTab(1)
        }

        view.findViewById<View>(R.id.btnSubscribeNewsletter).setOnClickListener {
            handleSubscribe()
        }

        view.findViewById<View>(R.id.btnScrollToTop).setOnClickListener {
            scrollHome.smoothScrollTo(0, 0)
        }

        vpBanners.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                super.onPageSelected(position)
                resetImageTimerIfNeeded(position)
            }
        })

        CartManager.addListener { updateCartBadge() }
        NotificationService.addListener { updateNotifBadge() }
        updateCartBadge()
        updateNotifBadge()
    }

    private fun setupHeaderActions(view: View) {
        view.findViewById<View>(R.id.btnHeaderSearch).setOnClickListener {
            SearchBottomSheetDialog(allProducts).show(childFragmentManager, "SearchModal")
        }

        view.findViewById<View>(R.id.btnHeaderNotifications).setOnClickListener {
            NotificationBottomSheetDialog().show(childFragmentManager, "NotifModal")
        }

        view.findViewById<View>(R.id.btnHeaderAccount).setOnClickListener {
            AccountBottomSheetDialog().show(childFragmentManager, "AccountModal")
        }

        view.findViewById<View>(R.id.btnHeaderCart).setOnClickListener {
            startActivity(Intent(requireContext(), CartActivity::class.java))
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

    private fun updateNotifBadge() {
        val count = NotificationService.unreadCount
        if (count > 0) {
            tvNotifBadge.visibility = View.VISIBLE
            tvNotifBadge.text = "$count"
        } else {
            tvNotifBadge.visibility = View.GONE
        }
    }

    private fun resetImageTimerIfNeeded(currentPosition: Int) {
        bannerHandler.removeCallbacks(bannerRunnable)
        if (bannersList.size <= 1) return

        val current = bannersList.getOrNull(currentPosition) ?: return
        val isVideo = current.mediaType.equals("video", ignoreCase = true) ||
                current.mediaUrl.endsWith(".mp4", ignoreCase = true) ||
                current.mediaUrl.endsWith(".webm", ignoreCase = true) ||
                current.mediaUrl.endsWith(".mov", ignoreCase = true) ||
                current.mediaUrl.contains("/video/upload/", ignoreCase = true)

        // Images auto-scroll after 4.5 seconds.
        // Videos play 100% of their full duration and auto-scroll ONLY when the video completes!
        if (!isVideo) {
            bannerHandler.postDelayed(bannerRunnable, 4500)
        }
    }

    private fun loadData() {
        swipeRefresh.isRefreshing = true
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                bannersList = FirestoreService.getBanners()
                allProducts = FirestoreService.getProducts()

                // Setup Banners with full video auto-scrolling
                if (bannersList.isNotEmpty()) {
                    vpBanners.adapter = BannerPagerAdapter(
                        banners = bannersList,
                        onVideoCompleted = {
                            if (::vpBanners.isInitialized && bannersList.isNotEmpty()) {
                                val nextItem = (vpBanners.currentItem + 1) % bannersList.size
                                vpBanners.setCurrentItem(nextItem, true)
                            }
                        },
                        onBannerClick = {
                            (activity as? MainActivity)?.switchTab(1)
                        }
                    )
                    resetImageTimerIfNeeded(0)
                }

                // Setup Latest Collections - Line 1 (Even indexed items)
                val line1 = allProducts.filterIndexed { index, _ -> index % 2 == 0 }
                rvLatestLine1.adapter = ProductAdapter(line1, isHorizontal = true) { product ->
                    openProductDetail(product)
                }

                // Setup Latest Collections - Line 2 (Odd indexed items)
                val line2 = allProducts.filterIndexed { index, _ -> index % 2 != 0 }
                if (line2.isNotEmpty()) {
                    rvLatestLine2.visibility = View.VISIBLE
                    rvLatestLine2.adapter = ProductAdapter(line2, isHorizontal = true) { product ->
                        openProductDetail(product)
                    }
                } else {
                    rvLatestLine2.visibility = View.GONE
                }

                // Setup Best Sellers
                val best = allProducts.filter { it.bestseller || it.isFeatured }
                val displayBest = if (best.isNotEmpty()) best else allProducts.take(8)
                rvBestSellers.adapter = ProductAdapter(displayBest, isHorizontal = true) { product ->
                    openProductDetail(product)
                }

            } catch (e: Exception) {
                LuxuryToast.showError(requireContext(), "Could not load catalogue: ${e.message}")
            } finally {
                swipeRefresh.isRefreshing = false
            }
        }
    }

    private fun openProductDetail(product: Product) {
        val intent = Intent(requireContext(), ProductDetailActivity::class.java)
        intent.putExtra("product", product)
        startActivity(intent)
    }

    private fun handleSubscribe() {
        val email = etNewsletter.text.toString().trim()
        if (email.isEmpty() || !email.contains("@")) {
            LuxuryToast.showError(requireContext(), "Please enter a valid email address.", "VIP DROPS")
            return
        }

        viewLifecycleOwner.lifecycleScope.launch {
            val ok = FirestoreService.addSubscriber(email)
            if (ok) {
                etNewsletter.setText("")
                LuxuryToast.showSuccess(requireContext(), "Subscribed to Vraj Creation VIP Drops!", "VIP SUBSCRIBED")
            } else {
                LuxuryToast.showError(requireContext(), "Subscription failed. Please try again.")
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (::vpBanners.isInitialized) {
            resetImageTimerIfNeeded(vpBanners.currentItem)
        }
    }

    override fun onPause() {
        super.onPause()
        bannerHandler.removeCallbacks(bannerRunnable)
    }
}
