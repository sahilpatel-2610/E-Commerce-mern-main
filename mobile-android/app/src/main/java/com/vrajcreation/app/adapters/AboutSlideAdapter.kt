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
import com.vrajcreation.app.models.AboutSlide
import com.vrajcreation.app.utils.ImageHelper
import com.vrajcreation.app.views.LuxuryBannerVideoView
import java.io.File
import java.io.FileOutputStream

class AboutSlideAdapter(
    private val slides: List<AboutSlide>,
    private val onVideoCompleted: ((position: Int) -> Unit)? = null,
    private val onSlideClick: ((AboutSlide) -> Unit)? = null
) : RecyclerView.Adapter<AboutSlideAdapter.AboutSlideViewHolder>() {

    class AboutSlideViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val slideImage: ImageView = view.findViewById(R.id.ivAboutSlideImage)
        val slideVideo: LuxuryBannerVideoView = view.findViewById(R.id.vvAboutSlideVideo)
        val tagBadge: TextView = view.findViewById(R.id.tvAboutSlideTag)
        val title: TextView = view.findViewById(R.id.tvAboutSlideTitle)
        val caption: TextView = view.findViewById(R.id.tvAboutSlideCaption)
        val indicatorText: TextView? = view.findViewById(R.id.tvAboutSlideIndicator)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): AboutSlideViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_about_slide, parent, false)
        return AboutSlideViewHolder(view)
    }

    override fun onBindViewHolder(holder: AboutSlideViewHolder, position: Int) {
        val slide = slides[position]
        holder.title.text = if (slide.title.isNotEmpty()) slide.title else "Surat Atelier Lookbook"
        holder.caption.text = if (slide.caption.isNotEmpty()) slide.caption else "Bespoke Craftsmanship & Luxury Weaves"

        val tagText = if (slide.tag.isNotEmpty()) slide.tag else "LOOKBOOK 0${position + 1}"
        holder.tagBadge.text = "✨ ${tagText.uppercase()}"

        holder.indicatorText?.text = "${position + 1}/${slides.size}"

        val posterUrl = slide.src
        holder.slideImage.alpha = 1f
        holder.slideImage.visibility = View.VISIBLE
        ImageHelper.loadBanner(holder.slideImage, posterUrl)

        val media = slide.src.trim()
        val isVideo = media.endsWith(".mp4", ignoreCase = true) ||
                media.endsWith(".webm", ignoreCase = true) ||
                media.endsWith(".mov", ignoreCase = true) ||
                media.contains("/video/upload/", ignoreCase = true)

        if (isVideo) {
            setupVideoPlayback(holder, media)
        } else {
            holder.slideVideo.stop()
            holder.slideVideo.visibility = View.GONE
            holder.slideImage.visibility = View.VISIBLE
            holder.slideImage.alpha = 1f
        }

        val clickListener = View.OnClickListener { onSlideClick?.invoke(slide) }
        holder.itemView.setOnClickListener(clickListener)
    }

    private fun setupVideoPlayback(holder: AboutSlideViewHolder, media: String) {
        val context = holder.itemView.context
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
                holder.slideVideo.visibility = View.VISIBLE
                holder.slideVideo.setLooping(false)
                holder.slideVideo.setOnCompletionCallback {
                    val pos = holder.bindingAdapterPosition
                    if (pos != RecyclerView.NO_POSITION) {
                        onVideoCompleted?.invoke(pos)
                    }
                }

                holder.slideVideo.setOnFirstFrameRenderedCallback {
                    holder.slideImage.animate()
                        .alpha(0f)
                        .setDuration(250)
                        .withEndAction {
                            holder.slideImage.visibility = View.GONE
                            holder.slideImage.alpha = 1f
                        }
                        .start()
                }

                holder.slideVideo.playVideo(videoUri)
            } else {
                holder.slideVideo.visibility = View.GONE
            }
        } catch (_: Exception) {
            holder.slideVideo.visibility = View.GONE
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

    override fun onViewRecycled(holder: AboutSlideViewHolder) {
        super.onViewRecycled(holder)
        holder.slideVideo.stop()
    }

    override fun getItemCount(): Int = slides.size
}
