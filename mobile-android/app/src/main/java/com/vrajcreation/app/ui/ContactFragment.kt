package com.vrajcreation.app.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.Animation
import android.view.animation.RotateAnimation
import android.widget.ImageView
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.vrajcreation.app.R
import com.vrajcreation.app.api.FirestoreService
import com.vrajcreation.app.utils.ImageHelper
import com.vrajcreation.app.utils.LuxuryToast
import com.vrajcreation.app.views.LuxuryBannerVideoView
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream

class ContactFragment : Fragment() {

    private lateinit var tvOfficeTitle: TextView
    private lateinit var tvOfficeAddress: TextView
    private lateinit var tvContactPhone: TextView
    private lateinit var tvContactEmail: TextView
    private lateinit var ivShowroomBanner: ImageView
    private lateinit var vvShowroomVideo: LuxuryBannerVideoView
    private lateinit var tvShowroomCity: TextView

    private var currentMediaUrl: String = ""

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_contact, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        tvOfficeTitle = view.findViewById(R.id.tvOfficeTitle)
        tvOfficeAddress = view.findViewById(R.id.tvOfficeAddress)
        tvContactPhone = view.findViewById(R.id.tvContactPhone)
        tvContactEmail = view.findViewById(R.id.tvContactEmail)
        ivShowroomBanner = view.findViewById(R.id.ivShowroomBanner)
        vvShowroomVideo = view.findViewById(R.id.vvShowroomVideo)
        tvShowroomCity = view.findViewById(R.id.tvShowroomCity)

        val btnRefresh = view.findViewById<View>(R.id.btnRefreshContact)
        btnRefresh?.setOnClickListener {
            val anim = RotateAnimation(
                0f, 360f,
                Animation.RELATIVE_TO_SELF, 0.5f,
                Animation.RELATIVE_TO_SELF, 0.5f
            ).apply {
                duration = 600
                interpolator = AccelerateDecelerateInterpolator()
            }
            btnRefresh.startAnimation(anim)
            LuxuryToast.showInfo(requireContext(), "Refreshing contact & atelier showroom info...", "CONTACT US")
            loadData()
        }

        loadData()

        view.findViewById<View>(R.id.btnCareersOpenings).setOnClickListener {
            LuxuryToast.showInfo(
                requireContext(),
                "Send your portfolio/resume to careers@vrajcreation.com with subject 'Artisan Application'.",
                "CAREERS AT VRAJ"
            )
        }

        // Phone call click
        tvContactPhone.setOnClickListener {
            val phoneNum = tvContactPhone.text.toString().trim()
            if (phoneNum.isNotEmpty()) {
                try {
                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${phoneNum.replace(" ", "")}"))
                    startActivity(intent)
                } catch (_: Exception) {}
            }
        }

        // Email click
        tvContactEmail.setOnClickListener {
            val emailAddr = tvContactEmail.text.toString().trim()
            if (emailAddr.isNotEmpty()) {
                try {
                    val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$emailAddr"))
                    startActivity(intent)
                } catch (_: Exception) {}
            }
        }
    }

    private fun loadData() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val info = FirestoreService.getContactInfo()
                tvOfficeTitle.text = if (info.title.isNotEmpty()) info.title else "VRAJ CREATION HEADQUARTERS"
                tvOfficeAddress.text = if (info.address.isNotEmpty()) info.address else "Surat Textile Market, Ring Road, Surat, Gujarat 395002"
                tvContactPhone.text = if (info.phone.isNotEmpty()) info.phone else "+91 98765 43210"
                tvContactEmail.text = if (info.email.isNotEmpty()) info.email else "concierge@vrajcreation.com"

                // Determine showroom media (contact info image/video or about slide fallback)
                var mediaUrl = info.videoUrl.ifEmpty { info.image }
                if (mediaUrl.isEmpty()) {
                    val liveSlides = FirestoreService.getAboutSlides()
                    if (liveSlides.isNotEmpty()) {
                        mediaUrl = liveSlides.first().src
                    }
                }

                currentMediaUrl = mediaUrl
                bindShowroomMedia(mediaUrl)
            } catch (_: Exception) {}
        }
    }

    private fun bindShowroomMedia(media: String) {
        if (media.isEmpty()) return

        ivShowroomBanner.alpha = 1f
        ivShowroomBanner.visibility = View.VISIBLE
        ImageHelper.loadBanner(ivShowroomBanner, media)

        val isVideo = media.endsWith(".mp4", ignoreCase = true) ||
                media.endsWith(".webm", ignoreCase = true) ||
                media.endsWith(".mov", ignoreCase = true) ||
                media.contains("/video/upload/", ignoreCase = true)

        if (isVideo) {
            setupVideoPlayback(media)
        } else {
            vvShowroomVideo.stop()
            vvShowroomVideo.visibility = View.GONE
            ivShowroomBanner.visibility = View.VISIBLE
            ivShowroomBanner.alpha = 1f
        }
    }

    private fun setupVideoPlayback(media: String) {
        val context = context ?: return
        try {
            var videoUri: Uri? = null

            if (media.startsWith("http://") || media.startsWith("https://")) {
                val optimizedUrl = ImageHelper.optimizeUrl(media)
                videoUri = Uri.parse(if (optimizedUrl.endsWith(".mp4")) optimizedUrl else media)
            } else {
                var assetName = media.substringAfterLast("/")
                if (assetName == "Fashion-SaiAagaman.mp4" || assetName == "Vraj_Saiaagaman.mp4") {
                    assetName = "Fashion_saiaagaman.mp4"
                }
                val cachedFile = getAssetFile(context, "videos/$assetName")
                if (cachedFile != null && cachedFile.exists()) {
                    videoUri = Uri.fromFile(cachedFile)
                }
            }

            if (videoUri != null) {
                vvShowroomVideo.visibility = View.VISIBLE
                vvShowroomVideo.setLooping(true)
                vvShowroomVideo.setOnFirstFrameRenderedCallback {
                    ivShowroomBanner.animate()
                        .alpha(0f)
                        .setDuration(250)
                        .withEndAction {
                            ivShowroomBanner.visibility = View.GONE
                            ivShowroomBanner.alpha = 1f
                        }
                        .start()
                }
                vvShowroomVideo.playVideo(videoUri)
            } else {
                vvShowroomVideo.visibility = View.GONE
            }
        } catch (_: Exception) {
            vvShowroomVideo.visibility = View.GONE
        }
    }

    private fun getAssetFile(context: Context, assetPath: String): File? {
        return try {
            val fileName = assetPath.substringAfterLast("/")
            val outFile = File(context.cacheDir, fileName)
            if (!outFile.exists() || outFile.length() == 0L) {
                context.assets.open(assetPath).use { input ->
                    FileOutputStream(outFile).use { output ->
                        input.copyTo(output)
                    }
                }
            }
            outFile
        } catch (_: Exception) {
            null
        }
    }

    override fun onResume() {
        super.onResume()
        if (currentMediaUrl.isNotEmpty()) {
            vvShowroomVideo.resume()
        }
    }

    override fun onPause() {
        super.onPause()
        vvShowroomVideo.pause()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        vvShowroomVideo.stop()
    }
}
