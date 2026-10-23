package com.vrajcreation.app.data

import android.content.Context
import android.content.SharedPreferences
import com.vrajcreation.app.models.User

object UserSession {
    private const val PREF_NAME = "vraj_creation_user_pref"
    private const val KEY_IS_LOGGED_IN = "isLoggedIn"
    private const val KEY_USER_ID = "userId"
    private const val KEY_USER_NAME = "userName"
    private const val KEY_USER_EMAIL = "userEmail"
    private const val KEY_USER_PHONE = "userPhone"
    private const val KEY_USER_ROLE = "userRole"
    private const val KEY_USER_ADDRESS = "userAddress"
    private const val KEY_USER_CITY = "userCity"
    private const val KEY_USER_STATE = "userState"
    private const val KEY_USER_PINCODE = "userPincode"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }

    fun isLoggedIn(context: Context): Boolean {
        val prefs = getPrefs(context)
        val email = prefs.getString(KEY_USER_EMAIL, "")?.trim() ?: ""
        return prefs.getBoolean(KEY_IS_LOGGED_IN, false) && email.isNotEmpty()
    }

    fun saveUser(context: Context, user: User) {
        val prefs = getPrefs(context)
        prefs.edit().apply {
            putBoolean(KEY_IS_LOGGED_IN, true)
            putString(KEY_USER_ID, user.id)
            putString(KEY_USER_NAME, user.name)
            putString(KEY_USER_EMAIL, user.email.trim().lowercase())
            putString(KEY_USER_PHONE, user.phone)
            putString(KEY_USER_ROLE, user.role)
            putString(KEY_USER_ADDRESS, user.address)
            putString(KEY_USER_CITY, user.city)
            putString(KEY_USER_STATE, user.state)
            putString(KEY_USER_PINCODE, user.pincode)
            apply()
        }
    }

    fun getUser(context: Context): User {
        val prefs = getPrefs(context)
        return User(
            id = prefs.getString(KEY_USER_ID, "") ?: "",
            name = prefs.getString(KEY_USER_NAME, "Valued Patron") ?: "Valued Patron",
            email = prefs.getString(KEY_USER_EMAIL, "") ?: "",
            phone = prefs.getString(KEY_USER_PHONE, "") ?: "",
            role = prefs.getString(KEY_USER_ROLE, "customer") ?: "customer",
            address = prefs.getString(KEY_USER_ADDRESS, "") ?: "",
            city = prefs.getString(KEY_USER_CITY, "") ?: "",
            state = prefs.getString(KEY_USER_STATE, "") ?: "",
            pincode = prefs.getString(KEY_USER_PINCODE, "") ?: ""
        )
    }

    fun cacheCredentials(context: Context, name: String, email: String, phone: String, pass: String, role: String) {
        val cleanEmail = email.trim().lowercase()
        val prefs = getPrefs(context)
        prefs.edit().apply {
            putString("local_auth_pass_$cleanEmail", pass.trim())
            putString("local_auth_name_$cleanEmail", name.trim().ifEmpty { "Valued Patron" })
            putString("local_auth_phone_$cleanEmail", phone.trim())
            putString("local_auth_role_$cleanEmail", role)
            apply()
        }
    }

    data class CachedAuth(val user: User, val password: String)

    fun getCachedCredentials(context: Context, email: String): CachedAuth? {
        val cleanEmail = email.trim().lowercase()
        val prefs = getPrefs(context)
        val pass = prefs.getString("local_auth_pass_$cleanEmail", null) ?: return null
        val name = prefs.getString("local_auth_name_$cleanEmail", "Valued Patron") ?: "Valued Patron"
        val phone = prefs.getString("local_auth_phone_$cleanEmail", "") ?: ""
        val role = prefs.getString("local_auth_role_$cleanEmail", "customer") ?: "customer"
        val docId = "usr_${cleanEmail.replace(Regex("[^a-zA-Z0-9]"), "_")}"
        return CachedAuth(User(id = docId, name = name, email = cleanEmail, phone = phone, role = role), pass)
    }

    fun logout(context: Context) {
        val prefs = getPrefs(context)
        prefs.edit().putBoolean(KEY_IS_LOGGED_IN, false).putString(KEY_USER_EMAIL, "").apply()
    }
}
