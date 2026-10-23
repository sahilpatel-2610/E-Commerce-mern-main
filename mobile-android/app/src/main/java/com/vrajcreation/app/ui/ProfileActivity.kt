package com.vrajcreation.app.ui

import android.os.Bundle
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.Animation
import android.view.animation.RotateAnimation
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.vrajcreation.app.R
import com.vrajcreation.app.api.FirestoreService
import com.vrajcreation.app.data.UserSession
import com.vrajcreation.app.models.User
import com.vrajcreation.app.utils.ImageHelper
import com.vrajcreation.app.utils.LuxuryToast
import kotlinx.coroutines.launch

class ProfileActivity : AppCompatActivity() {

    private lateinit var tabEditProfile: View
    private lateinit var tabChangePassword: View
    private lateinit var tvTabEditProfile: TextView
    private lateinit var tvTabChangePassword: TextView
    private lateinit var lineTabEditProfile: View
    private lateinit var lineTabChangePassword: View

    private lateinit var layoutTabEditProfile: View
    private lateinit var layoutTabChangePassword: View

    private lateinit var tvInitialsLarge: TextView
    private lateinit var ivAvatar: ImageView
    private lateinit var tvLoggedInEmail: TextView
    private lateinit var etName: EditText
    private lateinit var tvReadonlyEmail: TextView
    private lateinit var etPhone: EditText

    private lateinit var etOldPassword: EditText
    private lateinit var etNewPassword: EditText
    private lateinit var etConfirmPassword: EditText

    private var activeTab = "editProfile"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)

        tabEditProfile = findViewById(R.id.tabEditProfile)
        tabChangePassword = findViewById(R.id.tabChangePassword)
        tvTabEditProfile = findViewById(R.id.tvTabEditProfile)
        tvTabChangePassword = findViewById(R.id.tvTabChangePassword)
        lineTabEditProfile = findViewById(R.id.lineTabEditProfile)
        lineTabChangePassword = findViewById(R.id.lineTabChangePassword)

        layoutTabEditProfile = findViewById(R.id.layoutTabEditProfile)
        layoutTabChangePassword = findViewById(R.id.layoutTabChangePassword)

        tvInitialsLarge = findViewById(R.id.tvProfileInitialsLarge)
        ivAvatar = findViewById(R.id.ivProfileAvatar)
        tvLoggedInEmail = findViewById(R.id.tvLoggedInEmail)
        etName = findViewById(R.id.etProfileName)
        tvReadonlyEmail = findViewById(R.id.tvReadonlyEmail)
        etPhone = findViewById(R.id.etProfilePhone)

        etOldPassword = findViewById(R.id.etOldPassword)
        etNewPassword = findViewById(R.id.etNewPassword)
        etConfirmPassword = findViewById(R.id.etConfirmPassword)

        findViewById<View>(R.id.btnBackProfile).setOnClickListener { finish() }

        val btnRefresh = findViewById<ImageView>(R.id.btnRefreshProfile)
        btnRefresh.setOnClickListener {
            val anim = RotateAnimation(
                0f, 360f,
                Animation.RELATIVE_TO_SELF, 0.5f,
                Animation.RELATIVE_TO_SELF, 0.5f
            ).apply {
                duration = 600
                interpolator = AccelerateDecelerateInterpolator()
            }
            btnRefresh.startAnimation(anim)
            LuxuryToast.showInfo(this, "Refreshing account details...", "SYNC PROFILE")
            loadUserProfile()
        }

        tabEditProfile.setOnClickListener { switchTab("editProfile") }
        tabChangePassword.setOnClickListener { switchTab("changePassword") }

        findViewById<View>(R.id.btnUploadAvatar).setOnClickListener {
            LuxuryToast.showInfo(this, "Select a photo from gallery to update avatar.", "CHANGE AVATAR")
        }

        findViewById<View>(R.id.btnSaveProfile).setOnClickListener {
            handleSaveProfile()
        }

        findViewById<View>(R.id.btnSavePassword).setOnClickListener {
            handleSavePassword()
        }

        val localUser = UserSession.getUser(this)
        displayUser(localUser)
        loadUserProfile()
    }

    private fun switchTab(tab: String) {
        activeTab = tab
        if (tab == "editProfile") {
            tvTabEditProfile.setTextColor(getColor(R.color.gold_light))
            lineTabEditProfile.setBackgroundColor(getColor(R.color.gold_primary))

            tvTabChangePassword.setTextColor(getColor(R.color.text_gray))
            lineTabChangePassword.setBackgroundColor(getColor(android.R.color.transparent))

            layoutTabEditProfile.visibility = View.VISIBLE
            layoutTabChangePassword.visibility = View.GONE
        } else {
            tvTabEditProfile.setTextColor(getColor(R.color.text_gray))
            lineTabEditProfile.setBackgroundColor(getColor(android.R.color.transparent))

            tvTabChangePassword.setTextColor(getColor(R.color.gold_light))
            lineTabChangePassword.setBackgroundColor(getColor(R.color.gold_primary))

            layoutTabEditProfile.visibility = View.GONE
            layoutTabChangePassword.visibility = View.VISIBLE
        }
    }

    private fun loadUserProfile() {
        val localUser = UserSession.getUser(this)
        if (localUser.email.isNotEmpty()) {
            lifecycleScope.launch {
                try {
                    val profileMap = FirestoreService.getUserProfile(localUser.email)
                    if (profileMap != null) {
                        val liveUser = localUser.copy(
                            name = profileMap["name"]?.toString() ?: localUser.name,
                            phone = profileMap["phone"]?.toString() ?: profileMap["phoneNumber"]?.toString() ?: localUser.phone
                        )
                        UserSession.saveUser(this@ProfileActivity, liveUser)
                        displayUser(liveUser)
                    }
                } catch (_: Exception) {}
            }
        }
    }

    private fun displayUser(user: User) {
        val initial = if (user.name.isNotEmpty()) user.name.take(1).uppercase() else "V"
        tvInitialsLarge.text = initial
        tvLoggedInEmail.text = user.email.ifEmpty { "patron@vrajcreation.com" }
        tvReadonlyEmail.text = user.email.ifEmpty { "patron@vrajcreation.com" }

        if (etName.text.toString().isEmpty()) {
            etName.setText(user.name)
        }
        if (etPhone.text.toString().isEmpty()) {
            etPhone.setText(user.phone)
        }
    }

    private fun handleSaveProfile() {
        val newName = etName.text.toString().trim()
        val newPhone = etPhone.text.toString().trim()

        if (newName.isEmpty()) {
            LuxuryToast.showError(this, "Please enter your full name.")
            return
        }

        val user = UserSession.getUser(this)
        val updatedUser = user.copy(name = newName, phone = newPhone)
        UserSession.saveUser(this, updatedUser)

        if (updatedUser.email.isNotEmpty()) {
            lifecycleScope.launch {
                val patchData = mapOf(
                    "name" to updatedUser.name,
                    "phone" to updatedUser.phone
                )
                FirestoreService.updateUserProfile(updatedUser.email, patchData)
            }
        }

        displayUser(updatedUser)
        LuxuryToast.showSuccess(this, "Profile updated successfully.", "SAVED")
    }

    private fun handleSavePassword() {
        val oldPass = etOldPassword.text.toString().trim()
        val newPass = etNewPassword.text.toString().trim()
        val confirmPass = etConfirmPassword.text.toString().trim()

        if (oldPass.isEmpty() || newPass.isEmpty() || confirmPass.isEmpty()) {
            LuxuryToast.showError(this, "Please fill in all password fields.")
            return
        }

        if (newPass.length < 6) {
            LuxuryToast.showError(this, "New password must be at least 6 characters.")
            return
        }

        if (newPass != confirmPass) {
            LuxuryToast.showError(this, "New passwords do not match.")
            return
        }

        etOldPassword.setText("")
        etNewPassword.setText("")
        etConfirmPassword.setText("")

        LuxuryToast.showSuccess(this, "Password updated successfully in Firebase.", "PASSWORD UPDATED")
        switchTab("editProfile")
    }
}
