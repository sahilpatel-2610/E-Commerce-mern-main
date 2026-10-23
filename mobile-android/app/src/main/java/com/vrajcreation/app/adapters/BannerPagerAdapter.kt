package com.vrajcreation.app.adapters

import android.content.Context
import android.net.Uri
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.vrajcreation.app.R
import com.vrajcreation.app.models.HomeBanner
import com.vrajcreation.app.utils.ImageHelper
import com.vrajcreation.app.views.LuxuryBannerVideoView
import java.io.File
import java.io.FileOutputStream

class BannerPagerAdapter(
    private val banners: List<HomeBanner>,
    private val onVideoCompleted: (() -> Unit)? = null,
    private val onBannerClick: (HomeBanner) -> Unit
) : RecyclerView.Adapter<BannerPagerAdapter.BannerViewHolder>() {

    class BannerViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val bannerImage: ImageView = view.findViewById(R.id.ivBanner)
        val bannerVideo: LuxuryBannerVideoView = view.findViewById(R.id.vvBanner)
        val title1: TextView = view.findViewById(R.id.tvBannerTitle1)
        val title2: TextView = view.findViewById(R.id.tvBannerTitle2)
        val tagBadge: TextView = view.findViewById(R.id.tvBannerTag)
        val btnShopNow: TextView = view.findViewById(R.id.btnBannerShopNow)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): BannerViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_banner, parent, false)
        return BannerViewHolder(view)
    }

    override fun onBindViewHolder(holder: BannerViewHolder, position: Int) {
        val banner = banners[position]
        holder.title1.text = banner.title1
        holder.title2.text = banner.title2

        val tagText = if (banner.subtitle.isNotEmpty()) banner.subtitle else if (banner.tag.isNotEmpty()) banner.tag else "EXCLUSIVE"
        holder.tagBadge.text = tagText.uppercase()
        holder.tagBadge.visibility = View.VISIBLE

        // Always load poster first and keep visible to prevent ANY black screen
        val posterUrl = if (banner.posterUrl.isNotEmpty()) banner.posterUrl else banner.mediaUrl
        holder.bannerImage.alpha = 1f
        holder.bannerImage.visibility = View.VISIBLE
        ImageHelper.loadBanner(holder.bannerImage, posterUrl)

        val media = banner.mediaUrl.trim()
        val isVideo = banner.mediaType.equals("video", ignoreCase = true) ||
                media.endsWith(".mp4", ignoreCase = true) ||
                media.endsWith(".webm", ignoreCase = true) ||
                media.endsWith(".mov", ignoreCase = true) ||
                media.contains("/video/upload/", ignoreCase = true)

        if (isVideo) {
            setupVideoPlayback(holder, media)
        } else {
            holder.bannerVideo.stop()
            holder.bannerVideo.visibility = View.GONE
            holder.bannerImage.visibility = View.VISIBLE
            holder.bannerImage.alpha = 1f
        }

        val clickListener = View.OnClickListener { onBannerClick(banner) }
        holder.itemView.setOnClickListener(clickListener)
        holder.btnShopNow.setOnClickListener(clickListener)
    }

    private fun setupVideoPlayback(holder: BannerViewHolder, media: String) {
        val context = holder.itemView.context
        try {
            var videoUri: Uri? = null

            if (media.startsWith("http://") || media.startsWith("https://")) {
                val optimizedUrl = ImageHelper.optimizeUrl(media)
                videoUri = Uri.parse(if (optimizedUrl.endsWith(".mp4")) optimizedUrl else media)
            } else {
                // Local asset video playback
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
                holder.bannerVideo.visibility = View.VISIBLE
                holder.bannerVideo.setOnCompletionCallback {
                    onVideoCompleted?.invoke()
                }

                // Seamless zero-black-screen crossfade on exact first frame render
                holder.bannerVideo.setOnFirstFrameRenderedCallback {
                    holder.bannerImage.animate()
                        .alpha(0f)
                        .setDuration(250)
                        .withEndAction {
                            holder.bannerImage.visibility = View.GONE
                            holder.bannerImage.alpha = 1f
                        }
                        .start()
                }

                holder.bannerVideo.playVideo(videoUri)
            } else {
                holder.bannerVideo.visibility = View.GONE
            }
        } catch (_: Exception) {
            holder.bannerVideo.visibility = View.GONE
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

    override fun onViewRecycled(holder: BannerViewHolder) {
        super.onViewRecycled(holder)
        holder.bannerVideo.stop()
    }

    override fun getItemCount(): Int = banners.size
}
