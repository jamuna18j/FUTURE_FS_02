const express = require("express");

const {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  addNote,
  getActivities,
  getAnalytics
} = require("../controllers/leadController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/analytics", getAnalytics);

router.get("/", getLeads);

router.get("/:id/activities", getActivities);

router.get("/:id", getLead);

router.post("/", createLead);

router.put("/:id", updateLead);

router.delete("/:id", deleteLead);

router.post("/:id/notes", addNote);

module.exports = router;