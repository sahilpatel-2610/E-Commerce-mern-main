package com.vrajcreation.app.ui

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.viewpager2.widget.ViewPager2
import com.vrajcreation.app.R
import com.vrajcreation.app.adapters.AboutSlideAdapter
import com.vrajcreation.app.api.FirestoreService
import com.vrajcreation.app.models.AboutSlide
import com.vrajcreation.app.utils.LuxuryToast
import kotlinx.coroutines.launch

class AboutFragment : Fragment() {

    private lateinit var vpBanners: ViewPager2
    private lateinit var etNewsletter: EditText

    private var slidesList = listOf<AboutSlide>()

    private val bannerHandler = Handler(Looper.getMainLooper())
    private val bannerRunnable = object : Runnable {
        override fun run() {
            if (slidesList.isNotEmpty() && ::vpBanners.isInitialized) {
                val current = vpBanners.currentItem
                // Only auto-scroll on timer if current slide is an image
                if (!isVideoSlide(current)) {
                    val nextItem = (current + 1) % slidesList.size
                    vpBanners.setCurrentItem(nextItem, true)
                }
            }
        }
    }

    private val pageChangeCallback = object : ViewPager2.OnPageChangeCallback() {
        override fun onPageSelected(position: Int) {
            super.onPageSelected(position)
            updateAutoScrollTimer(position)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_about, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        vpBanners = view.findViewById(R.id.vpAboutBanners)
        etNewsletter = view.findViewById(R.id.etAboutNewsletterEmail)

        vpBanners.registerOnPageChangeCallback(pageChangeCallback)

        val btnRefresh = view.findViewById<View>(R.id.btnRefreshAbout)
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
            LuxuryToast.showInfo(requireContext(), "Refreshing atelier lookbook & story...", "ABOUT US")
            loadData()
        }

        view.findViewById<TextView>(R.id.btnAboutSubscribe).setOnClickListener {
            handleSubscribe()
        }

        loadData()
    }

    private fun isVideoSlide(position: Int): Boolean {
        if (position !in slidesList.indices) return false
        val media = slidesList[position].src.trim()
        return media.endsWith(".mp4", ignoreCase = true) ||
                media.endsWith(".webm", ignoreCase = true) ||
                media.endsWith(".mov", ignoreCase = true) ||
                media.contains("/video/upload/", ignoreCase = true)
    }

    private fun updateAutoScrollTimer(position: Int) {
        bannerHandler.removeCallbacks(bannerRunnable)
        if (slidesList.size <= 1) return

        // SMART AUTO-SCROLL:
        // If current slide is Video -> DO NOT schedule timer. The video will play completely and trigger onVideoCompleted!
        // If current slide is Image -> Auto-advance after 4.5 seconds.
        if (!isVideoSlide(position)) {
            bannerHandler.postDelayed(bannerRunnable, 4500)
        }
    }

    private fun loadData() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val liveSlides = FirestoreService.getAboutSlides()
                slidesList = if (liveSlides.isNotEmpty()) liveSlides else emptyList()

                if (slidesList.isNotEmpty()) {
                    vpBanners.adapter = AboutSlideAdapter(
                        slides = slidesList,
                        onVideoCompleted = { completedPosition ->
                            if (slidesList.isNotEmpty() && ::vpBanners.isInitialized) {
                                // Only advance if completed video is the current active slide
                                if (vpBanners.currentItem == completedPosition) {
                                    val next = (completedPosition + 1) % slidesList.size
                                    vpBanners.setCurrentItem(next, true)
                                }
                            }
                        },
                        onSlideClick = {
                            (activity as? MainActivity)?.switchTab(1)
                        }
                    )
                    updateAutoScrollTimer(vpBanners.currentItem)
                }
            } catch (_: Exception) {}
        }
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
        if (slidesList.isNotEmpty() && ::vpBanners.isInitialized) {
            updateAutoScrollTimer(vpBanners.currentItem)
        }
    }

    override fun onPause() {
        super.onPause()
        bannerHandler.removeCallbacks(bannerRunnable)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        bannerHandler.removeCallbacks(bannerRunnable)
        if (::vpBanners.isInitialized) {
            vpBanners.unregisterOnPageChangeCallback(pageChangeCallback)
        }
    }
}
