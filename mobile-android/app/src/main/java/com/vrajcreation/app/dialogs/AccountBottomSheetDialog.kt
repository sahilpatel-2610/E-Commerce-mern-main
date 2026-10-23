package com.vrajcreation.app.dialogs

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.vrajcreation.app.R
import com.vrajcreation.app.data.UserSession
import com.vrajcreation.app.ui.LoginActivity
import com.vrajcreation.app.ui.OrdersActivity
import com.vrajcreation.app.ui.ProfileActivity
import com.vrajcreation.app.utils.LuxuryToast

class AccountBottomSheetDialog : BottomSheetDialogFragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.dialog_account_menu, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val user = UserSession.getUser(requireContext())

        val tvInitials = view.findViewById<TextView>(R.id.tvUserInitials)
        val tvName = view.findViewById<TextView>(R.id.tvAccountUserName)
        val tvEmail = view.findViewById<TextView>(R.id.tvAccountUserEmail)

        tvName.text = if (user.name.isNotEmpty()) user.name else "Valued Patron"
        tvEmail.text = if (user.email.isNotEmpty()) user.email else "patron@vrajcreation.com"
        tvInitials.text = if (user.name.isNotEmpty()) user.name.take(1).uppercase() else "V"

        view.findViewById<View>(R.id.btnCloseAccountModal)?.setOnClickListener {
            dismiss()
        }

        // Flow 1: My Account
        view.findViewById<View>(R.id.menuActionProfile)?.setOnClickListener {
            dismiss()
            startActivity(Intent(requireContext(), ProfileActivity::class.java))
        }

        // Flow 2: My Orders
        view.findViewById<View>(R.id.menuActionOrders)?.setOnClickListener {
            dismiss()
            startActivity(Intent(requireContext(), OrdersActivity::class.java))
        }

        // Flow 3: Sign Out
        view.findViewById<View>(R.id.menuActionLogout)?.setOnClickListener {
            dismiss()
            UserSession.logout(requireContext())
            LuxuryToast.showInfo(
                requireContext(),
                "Logged out of Vraj Creation successfully.",
                "SIGNED OUT"
            )
            val intent = Intent(requireContext(), LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
        }
    }
}
