package com.vrajcreation.app.ui

import android.content.Intent
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.vrajcreation.app.R
import com.vrajcreation.app.api.FirestoreService
import com.vrajcreation.app.data.UserSession
import com.vrajcreation.app.models.User
import com.vrajcreation.app.utils.LuxuryToast
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    // Starts in Sign In mode by default
    private var isSignIn = true
    private var isPasswordVisible = false

    private lateinit var tvTitle: TextView
    private lateinit var tvSubtitle: TextView
    private lateinit var layoutName: View
    private lateinit var layoutPhone: View
    private lateinit var etName: EditText
    private lateinit var etPhone: EditText
    private lateinit var etEmail: EditText
    private lateinit var etPassword: EditText
    private lateinit var btnTogglePass: TextView
    private lateinit var btnForgotPassword: TextView
    private lateinit var btnSubmit: TextView
    private lateinit var btnCancel: TextView
    private lateinit var tvSwitchPrefix: TextView
    private lateinit var btnSwitchMode: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        tvTitle = findViewById(R.id.tvAuthTitle)
        tvSubtitle = findViewById(R.id.tvAuthSubtitle)
        layoutName = findViewById(R.id.layoutNameField)
        layoutPhone = findViewById(R.id.layoutPhoneField)
        etName = findViewById(R.id.etAuthName)
        etPhone = findViewById(R.id.etAuthPhone)
        etEmail = findViewById(R.id.etAuthEmail)
        etPassword = findViewById(R.id.etAuthPassword)
        btnTogglePass = findViewById(R.id.btnTogglePasswordVisibility)
        btnForgotPassword = findViewById(R.id.btnForgotPassword)
        btnSubmit = findViewById(R.id.btnAuthSubmit)
        btnCancel = findViewById(R.id.btnAuthCancel)
        tvSwitchPrefix = findViewById(R.id.tvSwitchModePrefix)
        btnSwitchMode = findViewById(R.id.btnSwitchMode)

        btnTogglePass.setOnClickListener {
            isPasswordVisible = !isPasswordVisible
            if (isPasswordVisible) {
                etPassword.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
                btnTogglePass.text = "🔒"
            } else {
                etPassword.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
                btnTogglePass.text = "👁"
            }
            etPassword.setSelection(etPassword.text.length)
        }

        btnForgotPassword.setOnClickListener {
            LuxuryToast.showInfo(
                this,
                "Please contact wholesale support at +91 98765 43210 to reset your password.",
                "PASSWORD RESET"
            )
        }

        btnSwitchMode.setOnClickListener {
            isSignIn = !isSignIn
            updateModeUi()
        }

        btnCancel.setOnClickListener {
            // Proceed as Guest Patron
            val guest = User(
                id = "usr_guest",
                name = "Valued Patron",
                email = "guest@vrajcreation.com",
                role = "guest"
            )
            UserSession.saveUser(this, guest)
            startActivity(Intent(this, MainActivity::class.java))
            finish()
        }

        btnSubmit.setOnClickListener {
            handleSubmit()
        }

        updateModeUi()
    }

    private fun updateModeUi() {
        if (isSignIn) {
            tvTitle.text = "Sign In"
            tvSubtitle.text = "Welcome back to Vraj Creation Wholesale Portal."
            layoutName.visibility = View.GONE
            layoutPhone.visibility = View.GONE
            btnForgotPassword.visibility = View.VISIBLE
            btnSubmit.text = "SIGN IN"
            tvSwitchPrefix.text = "Not Registered? "
            btnSwitchMode.text = "Sign Up"
        } else {
            tvTitle.text = "Sign Up"
            tvSubtitle.text = "Create your wholesale account to start ordering."
            layoutName.visibility = View.VISIBLE
            layoutPhone.visibility = View.VISIBLE
            btnForgotPassword.visibility = View.GONE
            btnSubmit.text = "SIGN UP"
            tvSwitchPrefix.text = "Already have an account? "
            btnSwitchMode.text = "Sign In"
        }
    }

    private fun handleSubmit() {
        val email = etEmail.text.toString().trim().lowercase()
        val password = etPassword.text.toString().trim()
        val name = etName.text.toString().trim()
        val phone = etPhone.text.toString().trim()

        if (email.isEmpty() || !email.contains("@")) {
            LuxuryToast.showError(this, "Please enter a valid email address.")
            return
        }

        if (password.length < 6) {
            LuxuryToast.showError(this, "Password must be at least 6 characters.")
            return
        }

        if (!isSignIn) {
            if (name.isEmpty()) {
                LuxuryToast.showError(this, "Please enter your full name.")
                return
            }
            if (phone.length != 10) {
                LuxuryToast.showError(this, "Please enter a valid 10-digit mobile number.")
                return
            }
        }

        btnSubmit.isEnabled = false
        btnSubmit.text = "PROCESSING..."

        lifecycleScope.launch {
            try {
                if (isSignIn) {
                    // 1. Authenticate user from Firestore (with local credentials fallback matching Flutter)
                    val authResult = FirestoreService.authenticateUser(email, password, this@LoginActivity)
                    btnSubmit.isEnabled = true
                    btnSubmit.text = "SIGN IN"

                    when (authResult) {
                        is FirestoreService.LoginResult.Success -> {
                            // User exists & password matches -> Save session & open MainActivity!
                            UserSession.saveUser(this@LoginActivity, authResult.user)
                            LuxuryToast.showSuccess(
                                this@LoginActivity,
                                "Logged in successfully! Welcome, ${authResult.user.name}.",
                                "WELCOME BACK"
                            )
                            val intent = Intent(this@LoginActivity, MainActivity::class.java).apply {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                            }
                            startActivity(intent)
                            finish()
                        }
                        is FirestoreService.LoginResult.UserNotFound -> {
                            // User account does not exist -> Prompt to Sign Up and switch mode
                            LuxuryToast.showInfo(
                                this@LoginActivity,
                                "No account found with this email. Please Sign Up to create your account.",
                                "PLEASE SIGN UP"
                            )
                            isSignIn = false
                            updateModeUi()
                            etName.requestFocus()
                        }
                        is FirestoreService.LoginResult.InvalidPassword -> {
                            // Account exists but wrong password
                            LuxuryToast.showError(
                                this@LoginActivity,
                                "Invalid password. Please check your credentials and try again.",
                                "SIGN IN FAILED"
                            )
                        }
                    }
                } else {
                    // 2. Sign Up: Register new user into Firestore + Backend + Local Cache
                    val user = FirestoreService.registerUser(name, email, password, phone, this@LoginActivity)
                    btnSubmit.isEnabled = true
                    btnSubmit.text = "SIGN UP"

                    if (user != null) {
                        // Switch to Sign In mode, clear password, retain email
                        isSignIn = true
                        updateModeUi()
                        etPassword.setText("")
                        etPassword.requestFocus()
                        LuxuryToast.showSuccess(
                            this@LoginActivity,
                            "Account registered successfully! Please sign in with your password.",
                            "REGISTRATION SUCCESSFUL"
                        )
                    } else {
                        LuxuryToast.showError(
                            this@LoginActivity,
                            "Failed to register account. Please check your internet connection.",
                            "REGISTRATION FAILED"
                        )
                    }
                }
            } catch (e: Exception) {
                btnSubmit.isEnabled = true
                btnSubmit.text = if (isSignIn) "SIGN IN" else "SIGN UP"
                LuxuryToast.showError(this@LoginActivity, "Error: ${e.message}")
            }
        }
    }
}
