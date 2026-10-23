import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/firebase_service.dart';
import '../services/dynamic_notification_service.dart';
import '../widgets/brand_logo.dart';
import '../utils/luxury_toast.dart';
import '../utils/api_logger.dart';
import '../widgets/luxury_loader.dart';
import '../main.dart';

class LoginScreen extends StatefulWidget {
  final bool isInitialLaunch;
  final bool showWelcomePrompt;

  const LoginScreen({
    super.key,
    this.isInitialLaunch = false,
    this.showWelcomePrompt = false,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String _currentState = "Sign In"; // "Sign In" or "Sign Up"
  bool _loading = false;
  bool _obscurePassword = true;
  final _formKey = GlobalKey<FormState>();
  final ScrollController _scrollController = ScrollController();

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  final FocusNode _nameFocus = FocusNode();
  final FocusNode _phoneFocus = FocusNode();
  final FocusNode _emailFocus = FocusNode();
  final FocusNode _passwordFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    _nameFocus.addListener(_handleFocusChange);
    _phoneFocus.addListener(_handleFocusChange);
    _emailFocus.addListener(_handleFocusChange);
    _passwordFocus.addListener(_handlePasswordFocus);
  }

  void _handleFocusChange() {
    if (mounted) {
      setState(() {});
    }
  }

  void _handlePasswordFocus() {
    if (mounted) {
      setState(() {});
    }
    if (_passwordFocus.hasFocus && _currentState == "Sign Up") {
      for (final delay in [80, 200, 350]) {
        Future.delayed(Duration(milliseconds: delay), () {
          if (mounted && _scrollController.hasClients) {
            _scrollController.animateTo(
              _scrollController.position.maxScrollExtent,
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeOutCubic,
            );
          }
        });
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _nameFocus.removeListener(_handleFocusChange);
    _phoneFocus.removeListener(_handleFocusChange);
    _emailFocus.removeListener(_handleFocusChange);
    _passwordFocus.removeListener(_handlePasswordFocus);
    _nameFocus.dispose();
    _phoneFocus.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final email = _emailController.text.trim().toLowerCase();
    final password = _passwordController.text.trim();

    setState(() => _loading = true);

    if (_currentState == "Sign Up") {
      // 1. Direct Firebase Firestore Registration with Phone Number & Admin Sync
      final success = await FirebaseService.registerUser(
        name: name.isNotEmpty ? name : "Valued Patron",
        email: email,
        phone: phone,
        password: password,
      );

      setState(() => _loading = false);

      if (success) {
        ApiLogger.logUserSignUp(
          name: name.isNotEmpty ? name : "Valued Patron",
          email: email,
          phone: phone,
          docId: FirebaseService.getUserDocId(email),
          role: email.contains("admin") ? "admin" : "customer",
          platform: "Mobile Flutter App",
        );

        if (mounted) {
          setState(() {
            _currentState = "Sign In";
            _passwordController.clear();
          });
          LuxuryToast.showSuccess(
            context,
            "Account registered successfully! Please sign in with your password.",
            title: "REGISTRATION SUCCESSFUL",
          );
        }
      } else {
        if (mounted) {
          LuxuryToast.showError(
            context,
            "Failed to register. An account with this email may already exist.",
            title: "REGISTRATION FAILED",
          );
        }
      }
    } else {
      // 2. Sign In via Backend API or Direct Firebase Firestore
      final user = await FirebaseService.loginUser(email, password);
      setState(() => _loading = false);

      if (user != null) {
        final sp = await SharedPreferences.getInstance();
        final userName = (user['name'] ?? 'Valued Patron').toString();
        final userPhone = (user['phone'] ?? user['phoneNumber'] ?? '').toString();
        final userRole = (user['role'] ?? 'customer').toString();
        final userAddress = (user['address'] ?? user['city'] ?? '').toString();
        final userAvatar = (user['image'] ?? user['avatar'] ?? '').toString();
        final userId = (user['_id'] ?? user['id'] ?? FirebaseService.getUserDocId(email)).toString();
        final isVideo = (user['isAvatarVideo'] == true) ||
            userAvatar.contains('/video/upload/') ||
            userAvatar.endsWith('.mp4') ||
            userAvatar.endsWith('.mov') ||
            userAvatar.endsWith('.webm');

        ApiLogger.logUserSignIn(
          email: email,
          name: userName,
          phone: userPhone,
          role: userRole,
          userId: userId,
          avatar: userAvatar,
        );

        await sp.remove('localAvatarPath');
        await sp.setString('userName', userName);
        await sp.setString('userEmail', email);
        await sp.setString('userPhone', userPhone);
        await sp.setString('userRole', userRole);
        await sp.setString('userId', userId);
        await sp.setString('userAddress', userAddress);
        await sp.setString('userAvatar', userAvatar);
        await sp.setString('cloudAvatarUrl', userAvatar);
        await sp.setBool('isAvatarVideo', isVideo);
        await sp.setBool('isLoggedIn', true);
        await DynamicNotificationService.onUserLoggedIn(email);

        if (mounted) {
          LuxuryToast.showSuccess(
            context,
            "Logged in successfully! Welcome, $userName.",
            title: "WELCOME BACK",
          );
          _proceedToApp();
        }
      } else {
        if (mounted) {
          LuxuryToast.showError(
            context,
            "Invalid email or password. Please check your credentials or create an account.",
            title: "SIGN IN FAILED",
          );
        }
      }
    }
  }

  void _proceedToApp() {
    if (widget.isInitialLaunch) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const MainNavigationHolder()),
      );
    } else {
      Navigator.pop(context, true);
    }
  }

  void _handleCancel() {
    _nameController.clear();
    _phoneController.clear();
    _emailController.clear();
    _passwordController.clear();
    _proceedToApp();
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required String hint,
    FocusNode? focusNode,
    TextInputAction textInputAction = TextInputAction.next,
    ValueChanged<String>? onFieldSubmitted,
    VoidCallback? onTap,
    bool isPassword = false,
    TextInputType keyboardType = TextInputType.text,
    List<TextInputFormatter>? inputFormatters,
    int? maxLength,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            color: Color(0xFFFBBF24),
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 4),
        TextFormField(
          controller: controller,
          focusNode: focusNode,
          textInputAction: textInputAction,
          onFieldSubmitted: onFieldSubmitted,
          onTap: onTap,
          scrollPadding: const EdgeInsets.only(bottom: 80, top: 20),
          obscureText: isPassword && _obscurePassword,
          keyboardType: keyboardType,
          inputFormatters: inputFormatters,
          maxLength: maxLength,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
          validator: validator,
          decoration: InputDecoration(
            counterText: "",
            hintText: hint,
            hintStyle: const TextStyle(color: Color(0xFF6B7280), fontSize: 12.5),
            filled: true,
            fillColor: const Color(0xFF14141A),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF27272A)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFF59E0B), width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFEF4444)),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFEF4444)),
            ),
            suffixIcon: isPassword
                ? IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility_off : Icons.visibility,
                      color: const Color(0xFF6B7280),
                      size: 19,
                    ),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  )
                : null,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isSignIn = _currentState == "Sign In";
    final isFocused = _nameFocus.hasFocus ||
        _phoneFocus.hasFocus ||
        _emailFocus.hasFocus ||
        _passwordFocus.hasFocus;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final isTyping = isFocused || (bottomInset > 50);
    final isSignUpPassword = !isSignIn && _passwordFocus.hasFocus;
    final double bottomPadding = isSignUpPassword ? 150.0 : (isTyping ? 12.0 : 20.0);

    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: GestureDetector(
          onTap: () => FocusScope.of(context).unfocus(),
          behavior: HitTestBehavior.opaque,
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                controller: _scrollController,
                physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics(),
                ),
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                padding: EdgeInsets.fromLTRB(
                  16,
                  isTyping ? 10 : 20,
                  16,
                  bottomPadding,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight - (isTyping ? 20 : 40),
                  ),
                  child: AnimatedAlign(
                    duration: const Duration(milliseconds: 280),
                    curve: Curves.easeOutCubic,
                    alignment: isTyping ? Alignment.topCenter : Alignment.center,
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 440),
                      padding: EdgeInsets.symmetric(
                        horizontal: isTyping ? 20 : 24,
                        vertical: isTyping ? 16 : 22,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF09090D),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0xFF27272A)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.9),
                            blurRadius: 24,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Top Logo (Large 66px initially, Compact 38px when typing)
                            Center(
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 280),
                                curve: Curves.easeOutCubic,
                                height: isTyping ? 38 : 66,
                                child: BrandLogo(height: isTyping ? 38 : 66),
                              ),
                            ),
                            SizedBox(height: isTyping ? 8 : 14),

                            // Title & Subtitle
                            Text(
                              _currentState,
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: isTyping ? 21 : 24,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              isSignIn
                                  ? "Welcome back to Vraj Creation Wholesale Portal."
                                  : "Create your wholesale account to start ordering.",
                              style: const TextStyle(
                                color: Color(0xFF9CA3AF),
                                fontSize: 11.5,
                                height: 1.3,
                              ),
                            ),
                            SizedBox(height: isTyping ? 10 : 16),

                            // Informational Message (Visible when not typing)
                            if (widget.showWelcomePrompt && !isTyping) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                                margin: const EdgeInsets.only(bottom: 14),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.35)),
                                ),
                                child: const Row(
                                  children: [
                                    Icon(Icons.info_outline, color: Color(0xFFFBBF24), size: 16),
                                    SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        "Please sign in or register to continue to the portal.",
                                        style: TextStyle(color: Color(0xFFFDE68A), fontSize: 11),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],

                            // Sign Up Fields
                            if (!isSignIn) ...[
                              _buildField(
                                label: "Full Name *",
                                hint: "Enter your name",
                                controller: _nameController,
                                focusNode: _nameFocus,
                                textInputAction: TextInputAction.next,
                                onFieldSubmitted: (_) => _phoneFocus.requestFocus(),
                                validator: (val) => val == null || val.isEmpty ? "Name is required" : null,
                              ),
                              const SizedBox(height: 8),
                              _buildField(
                                label: "Phone No. (10 Digits) *",
                                hint: "e.g. 1234567890",
                                controller: _phoneController,
                                focusNode: _phoneFocus,
                                keyboardType: TextInputType.phone,
                                textInputAction: TextInputAction.next,
                                onFieldSubmitted: (_) => _emailFocus.requestFocus(),
                                maxLength: 10,
                                inputFormatters: [
                                  FilteringTextInputFormatter.digitsOnly,
                                  LengthLimitingTextInputFormatter(10),
                                ],
                                validator: (val) {
                                  if (val == null || val.trim().isEmpty) {
                                    return "Phone number is required";
                                  }
                                  if (val.trim().length != 10) {
                                    return "Please enter exactly 10 digits";
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 8),
                            ],

                            // Email
                            _buildField(
                              label: "Email *",
                              hint: "name@example.com",
                              controller: _emailController,
                              focusNode: _emailFocus,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              onFieldSubmitted: (_) => _passwordFocus.requestFocus(),
                              validator: (val) =>
                                  val == null || !val.contains('@') ? "Enter a valid email" : null,
                            ),
                            const SizedBox(height: 8),

                            // Password
                            _buildField(
                              label: "Password *",
                              hint: isSignIn ? "Enter your password" : "At least 6 characters",
                              controller: _passwordController,
                              focusNode: _passwordFocus,
                              isPassword: true,
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) => _handleSubmit(),
                              onTap: _handlePasswordFocus,
                              validator: (val) => val == null || val.length < 6
                                  ? "Password must be >= 6 characters"
                                  : null,
                            ),
                            const SizedBox(height: 6),

                            // Forgot Password
                            if (isSignIn) ...[
                              Align(
                                alignment: Alignment.centerLeft,
                                child: TextButton(
                                  style: TextButton.styleFrom(
                                    padding: EdgeInsets.zero,
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  onPressed: () {
                                    LuxuryToast.showInfo(
                                      context,
                                      "Please contact support at +91 98765 43210 to reset your password.",
                                      title: "PASSWORD RESET",
                                      icon: Icons.lock_reset_rounded,
                                    );
                                  },
                                  child: const Text(
                                    "Forgot Password?",
                                    style: TextStyle(
                                        color: Color(0xFFFBBF24),
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                            ],
                            SizedBox(height: isTyping ? 12 : 16),

                            // Action Buttons (Sign In / Sign Up + Cancel)
                            Row(
                              children: [
                                Expanded(
                                  flex: 3,
                                  child: SizedBox(
                                    height: 46,
                                    child: ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        padding: EdgeInsets.zero,
                                        shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(12)),
                                        elevation: 3,
                                      ),
                                      onPressed: _loading ? null : _handleSubmit,
                                      child: Ink(
                                        decoration: BoxDecoration(
                                          gradient: const LinearGradient(
                                            colors: [
                                              Color(0xFFF59E0B),
                                              Color(0xFFFBBF24),
                                              Color(0xFFFCD34D)
                                            ],
                                            begin: Alignment.centerLeft,
                                            end: Alignment.centerRight,
                                          ),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Container(
                                          alignment: Alignment.center,
                                          child: _loading
                                              ? const GoldenSweepLoader(size: 18)
                                              : Text(
                                                  isSignIn ? "SIGN IN" : "SIGN UP",
                                                  style: const TextStyle(
                                                    color: Colors.black,
                                                    fontWeight: FontWeight.w900,
                                                    fontSize: 13.5,
                                                    letterSpacing: 1,
                                                  ),
                                                ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  flex: 2,
                                  child: SizedBox(
                                    height: 46,
                                    child: OutlinedButton(
                                      style: OutlinedButton.styleFrom(
                                        side: const BorderSide(
                                            color: Color(0xFF27272A), width: 1.5),
                                        shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(12)),
                                        padding: EdgeInsets.zero,
                                      ),
                                      onPressed: _handleCancel,
                                      child: const Text(
                                        "Cancel",
                                        style: TextStyle(
                                            color: Colors.white70,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),

                            // Switch between Sign In / Sign Up
                            Row(
                              children: [
                                Text(
                                  isSignIn ? "Not Registered? " : "Already have an account? ",
                                  style: const TextStyle(color: Colors.white54, fontSize: 11.5),
                                ),
                                GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _currentState = isSignIn ? "Sign Up" : "Sign In";
                                    });
                                  },
                                  child: Text(
                                    isSignIn ? "Sign Up" : "Sign In",
                                    style: const TextStyle(
                                      color: Color(0xFFFBBF24),
                                      fontWeight: FontWeight.w900,
                                      fontSize: 11.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
