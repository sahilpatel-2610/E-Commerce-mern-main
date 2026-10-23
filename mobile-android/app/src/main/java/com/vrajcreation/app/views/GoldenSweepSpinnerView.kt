package com.vrajcreation.app.views

import android.animation.ObjectAnimator
import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import android.view.animation.LinearInterpolator

class GoldenSweepSpinnerView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
    }
    private val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
    }
    private var shader: SweepGradient? = null
    private var animator: ObjectAnimator? = null

    init {
        val density = resources.displayMetrics.density
        val strokeW = 3f * density
        paint.strokeWidth = strokeW
        paint.strokeCap = Paint.Cap.ROUND

        borderPaint.strokeWidth = strokeW
        borderPaint.color = Color.argb(40, 245, 158, 11)

        animator = ObjectAnimator.ofFloat(this, "rotation", 0f, 360f).apply {
            duration = 1400
            repeatCount = ObjectAnimator.INFINITE
            interpolator = LinearInterpolator()
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        animator?.start()
    }

    override fun onDetachedFromWindow() {
        animator?.cancel()
        super.onDetachedFromWindow()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        val cx = w / 2f
        val cy = h / 2f
        shader = SweepGradient(
            cx, cy,
            intArrayOf(
                Color.parseColor("#F59E0B"),
                Color.parseColor("#FBBF24"),
                Color.parseColor("#00000000")
            ),
            floatArrayOf(0.0f, 0.5f, 1.0f)
        )
        paint.shader = shader
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val cx = width / 2f
        val cy = height / 2f
        val radius = (Math.min(width, height) / 2f) - (paint.strokeWidth / 2f)

        if (radius > 0) {
            canvas.drawCircle(cx, cy, radius, borderPaint)
            if (shader != null) {
                canvas.drawCircle(cx, cy, radius, paint)
            }
        }
    }
}
