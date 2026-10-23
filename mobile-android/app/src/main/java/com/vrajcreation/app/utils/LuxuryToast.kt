package com.vrajcreation.app.utils

import android.app.Activity
import android.content.Context
import android.view.Gravity
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import com.google.android.material.snackbar.Snackbar
import com.vrajcreation.app.R

object LuxuryToast {

    fun showSuccess(context: Context, message: String, title: String = "SUCCESS") {
        showCustom(
            context = context,
            title = title,
            message = message,
            iconRes = R.drawable.ic_check_circle,
            iconTint = R.color.status_green,
            titleColor = R.color.status_green,
            bgRes = R.drawable.bg_toast_success
        )
    }

    fun showError(context: Context, message: String, title: String = "NOTICE") {
        showCustom(
            context = context,
            title = title,
            message = message,
            iconRes = R.drawable.ic_error,
            iconTint = R.color.discount_red,
            titleColor = R.color.discount_red,
            bgRes = R.drawable.bg_toast_error
        )
    }

    fun showInfo(context: Context, message: String, title: String = "VRAJ CREATION") {
        showCustom(
            context = context,
            title = title,
            message = message,
            iconRes = R.drawable.ic_auto_awesome,
            iconTint = R.color.gold_light,
            titleColor = R.color.gold_light,
            bgRes = R.drawable.bg_toast_info
        )
    }

    private fun showCustom(
        context: Context,
        title: String,
        message: String,
        iconRes: Int,
        iconTint: Int,
        titleColor: Int,
        bgRes: Int
    ) {
        if (context is Activity) {
            context.runOnUiThread {
                try {
                    val rootView = context.findViewById<ViewGroup>(android.R.id.content)
                    if (rootView != null) {
                        val inflater = LayoutInflater.from(context)
                        val customView = inflater.inflate(R.layout.layout_luxury_toast, rootView, false)

                        val container = customView.findViewById<ViewGroup>(R.id.layoutToastContainer)
                        val ivIcon = customView.findViewById<ImageView>(R.id.ivToastIcon)
                        val tvTitle = customView.findViewById<TextView>(R.id.tvToastTitle)
                        val tvMessage = customView.findViewById<TextView>(R.id.tvToastMessage)

                        container.setBackgroundResource(bgRes)
                        ivIcon.setImageResource(iconRes)
                        ivIcon.setColorFilter(context.getColor(iconTint))
                        tvTitle.text = title.uppercase()
                        tvTitle.setTextColor(context.getColor(titleColor))
                        tvMessage.text = message

                        val snackbar = Snackbar.make(rootView, "", Snackbar.LENGTH_LONG)
                        val snackLayout = snackbar.view as Snackbar.SnackbarLayout

                        snackLayout.removeAllViews()
                        snackLayout.setBackgroundColor(android.graphics.Color.TRANSPARENT)
                        snackLayout.setPadding(0, 0, 0, 0)
                        snackLayout.addView(customView)

                        val density = context.resources.displayMetrics.density
                        val params = snackLayout.layoutParams
                        if (params is FrameLayout.LayoutParams) {
                            params.gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
                            params.bottomMargin = (76 * density).toInt()
                            params.leftMargin = (16 * density).toInt()
                            params.rightMargin = (16 * density).toInt()
                            snackLayout.layoutParams = params
                        }

                        snackbar.show()
                        return@runOnUiThread
                    }
                } catch (_: Exception) {}

                showFallbackToast(context, title, message, iconRes, iconTint, titleColor, bgRes)
            }
        } else {
            showFallbackToast(context, title, message, iconRes, iconTint, titleColor, bgRes)
        }
    }

    private fun showFallbackToast(
        context: Context,
        title: String,
        message: String,
        iconRes: Int,
        iconTint: Int,
        titleColor: Int,
        bgRes: Int
    ) {
        try {
            val inflater = LayoutInflater.from(context)
            val customView = inflater.inflate(R.layout.layout_luxury_toast, null)
            val container = customView.findViewById<ViewGroup>(R.id.layoutToastContainer)
            val ivIcon = customView.findViewById<ImageView>(R.id.ivToastIcon)
            val tvTitle = customView.findViewById<TextView>(R.id.tvToastTitle)
            val tvMessage = customView.findViewById<TextView>(R.id.tvToastMessage)

            container.setBackgroundResource(bgRes)
            ivIcon.setImageResource(iconRes)
            ivIcon.setColorFilter(context.getColor(iconTint))
            tvTitle.text = title.uppercase()
            tvTitle.setTextColor(context.getColor(titleColor))
            tvMessage.text = message

            val density = context.resources.displayMetrics.density
            val t = Toast(context)
            t.duration = Toast.LENGTH_LONG
            t.view = customView
            t.setGravity(Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL, 0, (76 * density).toInt())
            t.show()
        } catch (_: Exception) {
            val t = Toast.makeText(context, "$title: $message", Toast.LENGTH_SHORT)
            t.show()
        }
    }
}
