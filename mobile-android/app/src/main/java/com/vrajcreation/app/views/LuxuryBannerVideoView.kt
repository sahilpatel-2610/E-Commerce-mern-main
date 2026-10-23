package com.vrajcreation.app.views

import android.content.Context
import android.graphics.Matrix
import android.graphics.SurfaceTexture
import android.media.MediaPlayer
import android.net.Uri
import android.util.AttributeSet
import android.view.Surface
import android.view.TextureView

class LuxuryBannerVideoView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : TextureView(context, attrs, defStyleAttr), TextureView.SurfaceTextureListener {

    private var mediaPlayer: MediaPlayer? = null
    private var videoUri: Uri? = null
    private var surface: Surface? = null
    private var isPrepared = false
    private var isLooping = false
    private var onCompletionListener: (() -> Unit)? = null
    private var onFirstFrameRenderedListener: (() -> Unit)? = null

    init {
        surfaceTextureListener = this
    }

    fun setLooping(loop: Boolean) {
        isLooping = loop
        try {
            mediaPlayer?.isLooping = loop
        } catch (_: Exception) {}
    }

    fun setOnCompletionCallback(callback: () -> Unit) {
        onCompletionListener = callback
    }

    fun setOnFirstFrameRenderedCallback(callback: () -> Unit) {
        onFirstFrameRenderedListener = callback
    }

    fun playVideo(uri: Uri) {
        videoUri = uri
        if (isAvailable && surfaceTexture != null) {
            prepareMediaPlayer()
        }
    }

    fun pause() {
        try {
            if (mediaPlayer?.isPlaying == true) {
                mediaPlayer?.pause()
            }
        } catch (_: Exception) {}
    }

    fun resume() {
        try {
            if (mediaPlayer != null && isPrepared && mediaPlayer?.isPlaying == false) {
                mediaPlayer?.start()
            } else if (videoUri != null) {
                playVideo(videoUri!!)
            }
        } catch (_: Exception) {}
    }

    fun stop() {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
            isPrepared = false
        } catch (_: Exception) {}
    }

    private fun prepareMediaPlayer() {
        val uri = videoUri ?: return
        val st = surfaceTexture ?: return
        stop()

        try {
            surface = Surface(st)
            mediaPlayer = MediaPlayer().apply {
                setSurface(surface)
                setDataSource(context, uri)
                setVolume(0f, 0f) // Muted luxury background audio
                isLooping = this@LuxuryBannerVideoView.isLooping
                setOnPreparedListener { mp ->
                    isPrepared = true
                    adjustAspectRatio(mp.videoWidth, mp.videoHeight)
                    mp.start()
                }
                setOnInfoListener { _, what, _ ->
                    // Exactly when the first frame of video is drawn on screen
                    if (what == MediaPlayer.MEDIA_INFO_VIDEO_RENDERING_START) {
                        onFirstFrameRenderedListener?.invoke()
                    }
                    true
                }
                setOnCompletionListener {
                    if (!this@LuxuryBannerVideoView.isLooping) {
                        onCompletionListener?.invoke()
                    }
                }
                setOnVideoSizeChangedListener { _, width, height ->
                    adjustAspectRatio(width, height)
                }
                prepareAsync()
            }
        } catch (e: Exception) {
            isPrepared = false
        }
    }

    private fun adjustAspectRatio(videoWidth: Int, videoHeight: Int) {
        if (videoWidth == 0 || videoHeight == 0) return
        val viewWidth = width.toFloat()
        val viewHeight = height.toFloat()
        if (viewWidth == 0f || viewHeight == 0f) return

        val matrix = Matrix()
        val videoAspect = videoWidth.toFloat() / videoHeight.toFloat()
        val viewAspect = viewWidth / viewHeight

        val finalScaleX: Float
        val finalScaleY: Float

        // Center-crop matrix calculation so video fills 100% of the box with zero black bars
        if (videoAspect > viewAspect) {
            finalScaleX = videoAspect / viewAspect
            finalScaleY = 1.0f
        } else {
            finalScaleX = 1.0f
            finalScaleY = viewAspect / videoAspect
        }

        val px = viewWidth / 2f
        val py = viewHeight / 2f
        matrix.setScale(finalScaleX, finalScaleY, px, py)
        setTransform(matrix)
    }

    override fun onSurfaceTextureAvailable(st: SurfaceTexture, w: Int, h: Int) {
        prepareMediaPlayer()
    }

    override fun onSurfaceTextureSizeChanged(st: SurfaceTexture, w: Int, h: Int) {
        mediaPlayer?.let { mp ->
            adjustAspectRatio(mp.videoWidth, mp.videoHeight)
        }
    }

    override fun onSurfaceTextureDestroyed(st: SurfaceTexture): Boolean {
        stop()
        surface?.release()
        surface = null
        return true
    }

    override fun onSurfaceTextureUpdated(st: SurfaceTexture) {}
}
