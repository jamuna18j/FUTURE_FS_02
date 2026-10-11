const supabase = require("../config/supabase");

const getEmailRedirectTo = () =>
  process.env.CLIENT_URL || "http://localhost:5173";

// REGISTER
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      (name !== undefined && typeof name !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required. Name is optional."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName =
      typeof name === "string" && name.trim()
        ? name.trim()
        : normalizedEmail.split("@")[0];

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters."
      });
    }

    const {
      data,
      error
    } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getEmailRedirectTo(),
        data: {
          full_name: normalizedName
        }
      }
    });

    if (error) {
      const errorStatus = Number(error.status);
      const status =
        Number.isInteger(errorStatus) &&
        errorStatus >= 400 &&
        errorStatus < 500
          ? errorStatus
          : 400;

      return res.status(status).json({
        success: false,
        message: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: data.session
        ? "Account created successfully."
        : "Account created. Please verify your email.",
      session: data.session,
      user: data.user
    });
  } catch (error) {
    console.error("Register error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to create account."
    });
  }
};


// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address."
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const {
      data,
      error
    } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (error) {
      if (error.code === "email_not_confirmed") {
        return res.status(403).json({
          success: false,
          message: "Confirm your email before logging in.",
          code: "EMAIL_NOT_CONFIRMED"
        });
      }

      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      message: "Login successful.",
      session: data.session,
      user: data.user
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to login."
    });
  }
};

// RESEND SIGNUP CONFIRMATION
const resendConfirmation = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required."
      });
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: getEmailRedirectTo()
      }
    });

    if (error) {
      const errorStatus = Number(error.status);
      const status =
        Number.isInteger(errorStatus) &&
        errorStatus >= 400 &&
        errorStatus < 500
          ? errorStatus
          : 400;

      return res.status(status).json({
        success: false,
        message: error.message
      });
    }

    return res.json({
      success: true,
      message: "If this account needs confirmation, a new email has been sent."
    });
  } catch (error) {
    console.error("Resend confirmation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to resend the confirmation email."
    });
  }
};


// CURRENT USER
const getMe = async (req, res) => {
  try {
    const token = req.accessToken;

    const userClient = require("../config/createUserClient")(token);

    const {
      data,
      error
    } = await userClient
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: "Profile not found."
      });
    }

    res.json({
      success: true,
      user: data
    });
  } catch (error) {
    console.error("Get profile error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load profile."
    });
  }
};


module.exports = {
  register,
  login,
  resendConfirmation,
  getMe
};