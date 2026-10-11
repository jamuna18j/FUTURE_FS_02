require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const leadRoutes = require("./routes/leadRoutes");

const app = express();


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:5173",
    credentials: true
  })
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);


// ==========================================
// HEALTH
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "LeadFlow CRM API is running 🚀",
    version: "1.0.0"
  });
});


app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      message:
        "LeadFlow CRM backend is healthy."
    });
  }
);


// ==========================================
// ROUTES
// ==========================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/leads",
  leadRoutes
);


// ==========================================
// 404
// ==========================================

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        "API endpoint not found."
    });
  }
);


// ==========================================
// ERROR HANDLER
// ==========================================

app.use(
  (error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    const errorStatus = Number(
      error.status || error.statusCode
    );
    const status =
      Number.isInteger(errorStatus) &&
      errorStatus >= 400 &&
      errorStatus <= 599
        ? errorStatus
        : 500;

    const message =
      status >= 500
        ? "Internal server error."
        : error.type === "entity.parse.failed"
          ? "Invalid JSON request body."
          : error.type === "entity.too.large"
            ? "Request body is too large."
            : "Invalid request.";

    if (status >= 500) {
      console.error("Server error:", error.message);
    }

    res.status(status).json({
      success: false,
      message
    });
  }
);


// ==========================================
// START SERVER
// ==========================================

const PORT =
  process.env.PORT || 5000;

app.listen(
  PORT,
  () => {
    console.log("");
    console.log(
      "🚀 LeadFlow CRM backend started"
    );
    console.log(
      `🌐 http://localhost:${PORT}`
    );
    console.log(
      `❤️ Health: http://localhost:${PORT}/api/health`
    );
    console.log("");
  }
);