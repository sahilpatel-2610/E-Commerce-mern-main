package com.vrajcreation.app.utils

import android.widget.ImageView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.engine.DiskCacheStrategy
import com.vrajcreation.app.R

object ImageHelper {

    fun optimizeUrl(url: String?, width: Int = 500): String {
        val trimmed = url?.trim() ?: return ""
        if (trimmed.isEmpty()) return ""

        if (trimmed.contains("res.cloudinary.com") && trimmed.contains("/upload/")) {
            if (trimmed.contains("/video/upload/")) {
                val uploadIndex = trimmed.indexOf("/upload/")
                val prefix = trimmed.substring(0, uploadIndex + 8)
                var rest = trimmed.substring(uploadIndex + 8)

                val versionMatch = Regex("(v\\d+/.+)").find(rest)
                if (versionMatch != null) {
                    rest = versionMatch.groupValues[1]
                }

                if (rest.endsWith(".mp4", ignoreCase = true) ||
                    rest.endsWith(".mov", ignoreCase = true) ||
                    rest.endsWith(".webm", ignoreCase = true) ||
                    rest.endsWith(".mkv", ignoreCase = true)
                ) {
                    val dotIdx = rest.lastIndexOf('.')
                    rest = rest.substring(0, dotIdx) + ".jpg"
                } else if (!rest.endsWith(".jpg") && !rest.endsWith(".png") && !rest.endsWith(".webp")) {
                    rest = "$rest.jpg"
                }

                return "${prefix}so_0,w_$width,c_limit,f_jpg,q_auto/$rest"
            }

            if (!trimmed.contains("/q_auto") && !trimmed.contains("/f_auto")) {
                return trimmed.replace("/upload/", "/upload/f_auto,q_auto:eco,w_$width,c_limit/")
            }
        }
        return trimmed
    }

    fun load(imageView: ImageView, url: String?) {
        val optimized = optimizeUrl(url, 500)
        if (optimized.isEmpty()) {
            imageView.setImageResource(R.drawable.app_logo)
            return
        }

        Glide.with(imageView.context)
            .load(optimized)
            .placeholder(R.drawable.bg_dark_card)
            .error(R.drawable.app_logo)
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .centerCrop()
            .into(imageView)
    }

    fun loadBanner(imageView: ImageView, url: String?) {
        val optimized = optimizeUrl(url, 900)
        if (optimized.isEmpty()) {
            imageView.setImageDrawable(null)
            imageView.setBackgroundResource(R.color.bg_dark)
            return
        }

        Glide.with(imageView.context)
            .load(optimized)
            .placeholder(R.drawable.bg_dark_card)
            .error(R.drawable.bg_dark_card)
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .centerCrop()
            .into(imageView)
    }
}
