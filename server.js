// Import required packages and modules
const express = require("express");
const http = require("http");
const connectDB = require("./config/db");
const mongoose = require("mongoose");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const multer = require("multer");

require("dotenv").config();

// Define the port on which the server will run
const port = process.env.PORT || 5004;

// Connect to the database
connectDB().catch((err) => {
  console.error("Database connection error:", err);
  process.exit(1); // Exit the process if the connection fails
});

// Create the Express application
const app = express();
app.get('/healthz', (_req, res) => {
  const up = mongoose.connection.readyState === 1;
  return res.status(up ? 200 : 503).json({ mongo: up ? 'ok' : 'down' });
});
var corsOptions = {
  origin: [
    "https://bbb-cms-app-i3tt8.ondigitalocean.app",
    "https://bbb-cms-1cdf289157e2.herokuapp.com",
    "https://bbb-cms-dev-85f38bd351ad.herokuapp.com",
    "https://cms.bootybybret.com"
  ],
  optionsSuccessStatus: 200, // For legacy browser support
};

if (process.env.NODE_ENV === "development") {
  corsOptions.origin.push("http://localhost:3000");
  corsOptions.origin.push("http://192.168.101.139:5004");
  // Add mobile app origins
  corsOptions.origin.push("*"); // Allow all origins in development
}

const storage = multer.memoryStorage();
const upload = multer({ storage });
// Enable cross-origin resource sharing
app.use(cors(corsOptions));

// Parse incoming JSON data
// app.use(express.json());
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
    limit: "50mb",
  })
);
// Parse incoming URL-encoded data
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(mongoSanitize());
app.use(upload.any());

// Define routes for the API
app.use("/api/screens", require("./routes/screenRoutes"));
app.use("/api/tutorials", require("./routes/tutorialRoutes"));
app.use("/api/version", require("./routes/versionRoutes"));
app.use("/api/popupworkout", require("./routes/popupworkoutRoutes"));
app.use("/api/popupequipment", require("./routes/popupequipmentRoutes"));
app.use("/api/popup-new-join", require("./routes/popupNewJoinRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/workouts", require("./routes/workoutRoutes"));
app.use("/api/exercises", require("./routes/exerciseRoutes"));
app.use("/api/warmups", require("./routes/warmupRoutes"));
app.use("/api/equipments", require("./routes/equipmentRoutes"));
app.use("/api/restdays", require("./routes/restdayRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/tags", require("./routes/tagsRoutes"));
app.use("/api/achievements-group", require("./routes/achievementsgroupRoutes"));
app.use("/api/achievements-individual", require("./routes/achievementsindividualRoutes"));
app.use("/api/achievements-target", require("./routes/achievementstargetRoutes"));
app.use("/api/staffs", require("./routes/staffRoutes"));
app.use("/api/challenges", require("./routes/challengeRoutes"));
app.use("/api/phases", require("./routes/phasesRoutes"));
app.use("/api/collections", require("./routes/collectionRoutes"));
app.use("/api/settings", require("./routes/settingRoutes"));
app.use("/api/bonuses", require("./routes/bonusRoutes"));
app.use("/api/program-info", require("./routes/programInfoRoutes"));
app.use("/api/pump-days", require("./routes/pumpDayRoutes"));
app.use("/api/woocommerce", require("./routes/woocommerceRoute"));
app.use("/api/revenuecat", require("./routes/revenuecatRoute"));
app.use("/api/exercise-history", require("./routes/exercisehistoryRoutes"));
app.use("/api/exercise-status", require("./routes/exercisestatusRoutes"));
app.use("/api/day-status", require("./routes/daystatusRoutes"));
app.use("/api/extra-set", require("./routes/extrasetRoutes"));
app.use("/api/remove-exercise", require("./routes/removeexerciseRoutes"));
app.use("/api/exercise-notes", require("./routes/exercisenotesRoutes"));
app.use("/api/extra-exercise", require("./routes/extraexerciseRoutes"));
app.use("/api/swap-exercise", require("./routes/swapexerciseRoutes"));
app.use("/api/day-status-list", require("./routes/daystatuslistRoutes"));
app.use("/api/streak-count", require("./routes/streakcountRoutes"));
app.use("/api/months-enrollment", require("./routes/monthenrollmentRoutes"));
app.use("/api/achievements", require("./routes/achievementsRoutes"));
app.use("/api/faqs", require("./routes/faqsRoutes"));
app.use("/api/location", require("./routes/locationRoutes"));
app.use("/api/tools", require("./routes/toolsRoutes"));
app.use("/api/money", require("./routes/moneyRoutes"));
app.use("/api/downloads", require("./routes/downloadRoutes"));
app.use("/api/lock", require("./routes/lockRoutes"));
const server = http.createServer(app);

// Error handling for server startup
server.listen(port, (err) => {
  if (err) {
    console.error("Server startup error:", err);
    return;
  }
  console.log(`Server started on port ${port}`);
});
