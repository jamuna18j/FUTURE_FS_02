const createUserClient = require("../config/createUserClient");


// ==========================================
// LEAD SCORE
// ==========================================

const calculateScore = (data) => {
  let score = 40;

  if (data.email) score += 10;
  if (data.phone) score += 10;
  if (data.company) score += 10;

  if (data.message && data.message.length > 20) {
    score += 10;
  }

  if (
    ["Referral", "LinkedIn", "WhatsApp"].includes(
      data.source
    )
  ) {
    score += 10;
  }

  if (data.follow_up_date) {
    score += 5;
  }

  score = Math.min(score, 100);

  let temperature = "Cold";

  if (score >= 75) {
    temperature = "Hot";
  } else if (score >= 50) {
    temperature = "Warm";
  }

  return {
    score,
    temperature
  };
};


// ==========================================
// GET LEADS
// ==========================================

const getLeads = async (req, res) => {
  try {
    const supabase = createUserClient(
      req.accessToken
    );

    const {
      search,
      status,
      source,
      temperature
    } = req.query;

    let query = supabase
      .from("leads")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    if (status) {
      query = query.eq("status", status);
    }

    if (source) {
      query = query.eq("source", source);
    }

    if (temperature) {
      query = query.eq(
        "temperature",
        temperature
      );
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    const {
      data,
      error
    } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      count: data.length,
      leads: data
    });
  } catch (error) {
    console.error("Get leads error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch leads."
    });
  }
};


// ==========================================
// GET SINGLE LEAD
// ==========================================

const getLead = async (req, res) => {
  try {
    const supabase = createUserClient(
      req.accessToken
    );

    const {
      data,
      error
    } = await supabase
      .from("leads")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: "Lead not found."
      });
    }

    res.json({
      success: true,
      lead: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch lead."
    });
  }
};


// ==========================================
// CREATE LEAD
// ==========================================

const createLead = async (req, res) => {
  try {
    const supabase = createUserClient(
      req.accessToken
    );

    const {
      name,
      email,
      phone,
      company,
      message,
      source,
      follow_up_date,
      tags
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required."
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    // Duplicate detection
    const {
      data: existing
    } = await supabase
      .from("leads")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "A lead with this email already exists.",
        existingLeadId: existing.id
      });
    }

    const scoreData = calculateScore({
      email: normalizedEmail,
      phone,
      company,
      message,
      source,
      follow_up_date
    });

    const {
      data: lead,
      error
    } = await supabase
      .from("leads")
      .insert({
        owner_id: req.user.id,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone || null,
        company: company || null,
        message: message || null,
        source: source || "Website",
        status: "New",
        follow_up_date:
          follow_up_date || null,
        tags: tags || [],
        score: scoreData.score,
        temperature:
          scoreData.temperature
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Activity
    await supabase
      .from("activities")
      .insert({
        lead_id: lead.id,
        user_id: req.user.id,
        activity_type: "created",
        description:
          `Lead ${lead.name} was created.`
      });

    res.status(201).json({
      success: true,
      message: "Lead created successfully.",
      lead
    });
  } catch (error) {
    console.error("Create lead error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create lead."
    });
  }
};


// ==========================================
// UPDATE LEAD
// ==========================================

const updateLead = async (req, res) => {
  try {
    const supabase = createUserClient(
      req.accessToken
    );

    const leadId = req.params.id;

    // Get existing lead
    const {
      data: oldLead,
      error: oldError
    } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (oldError || !oldLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found."
      });
    }

    const updatedData = {
      name:
        req.body.name ?? oldLead.name,

      email:
        req.body.email
          ? req.body.email
              .trim()
              .toLowerCase()
          : oldLead.email,

      phone:
        req.body.phone ?? oldLead.phone,

      company:
        req.body.company ?? oldLead.company,

      message:
        req.body.message ?? oldLead.message,

      source:
        req.body.source ?? oldLead.source,

      status:
        req.body.status ?? oldLead.status,

      notes:
        req.body.notes ?? oldLead.notes,

      follow_up_date:
        req.body.follow_up_date ??
        oldLead.follow_up_date,

      tags:
        req.body.tags ?? oldLead.tags
    };

    // Recalculate score
    const scoreData =
      calculateScore(updatedData);

    updatedData.score =
      scoreData.score;

    updatedData.temperature =
      scoreData.temperature;

    const {
      data: lead,
      error
    } = await supabase
      .from("leads")
      .update(updatedData)
      .eq("id", leadId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Status activity
    if (
      oldLead.status !== lead.status
    ) {
      await supabase
        .from("activities")
        .insert({
          lead_id: lead.id,
          user_id: req.user.id,
          activity_type:
            "status_changed",
          description:
            `Status changed from ${oldLead.status} to ${lead.status}.`
        });
    }

    // Note activity
    if (
      req.body.notes !== undefined
    ) {
      await supabase
        .from("activities")
        .insert({
          lead_id: lead.id,
          user_id: req.user.id,
          activity_type:
            "note_added",
          description:
            "Lead notes were updated."
        });
    }

    // Follow-up activity
    if (
      req.body.follow_up_date !==
      undefined
    ) {
      await supabase
        .from("activities")
        .insert({
          lead_id: lead.id,
          user_id: req.user.id,
          activity_type:
            "followup_scheduled",
          description:
            lead.follow_up_date
              ? `Follow-up scheduled for ${new Date(
                  lead.follow_up_date
                ).toLocaleDateString()}`
              : "Follow-up removed."
        });
    }

    res.json({
      success: true,
      message:
        "Lead updated successfully.",
      lead
    });
  } catch (error) {
    console.error(
      "Update lead error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to update lead."
    });
  }
};


// ==========================================
// DELETE LEAD
// ==========================================

const deleteLead = async (req, res) => {
  try {
    const supabase = createUserClient(
      req.accessToken
    );

    const {
      error
    } = await supabase
      .from("leads")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message:
        "Lead deleted successfully."
    });
  } catch (error) {
    console.error(
      "Delete lead error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to delete lead."
    });
  }
};


// ==========================================
// ADD NOTE
// ==========================================

const addNote = async (req, res) => {
  try {
    const supabase = createUserClient(
      req.accessToken
    );

    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Note cannot be empty."
      });
    }

    const {
      data: lead,
      error
    } = await supabase
      .from("leads")
      .update({
        notes: note.trim()
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error || !lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found."
      });
    }

    await supabase
      .from("activities")
      .insert({
        lead_id: lead.id,
        user_id: req.user.id,
        activity_type:
          "note_added",
        description:
          `Note added: ${note.trim()}`
      });

    res.json({
      success: true,
      message:
        "Note added successfully.",
      lead
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to add note."
    });
  }
};


// ==========================================
// ACTIVITIES
// ==========================================

const getActivities = async (
  req,
  res
) => {
  try {
    const supabase =
      createUserClient(
        req.accessToken
      );

    const {
      data,
      error
    } = await supabase
      .from("activities")
      .select("*")
      .eq(
        "lead_id",
        req.params.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      activities: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to fetch activities."
    });
  }
};


// ==========================================
// ANALYTICS
// ==========================================

const getAnalytics = async (
  req,
  res
) => {
  try {
    const supabase =
      createUserClient(
        req.accessToken
      );

    const {
      data: leads,
      error
    } = await supabase
      .from("leads")
      .select("*");

    if (error) {
      throw error;
    }

    const total =
      leads.length;

    const newLeads =
      leads.filter(
        (l) => l.status === "New"
      ).length;

    const contacted =
      leads.filter(
        (l) =>
          l.status ===
          "Contacted"
      ).length;

    const followUps =
      leads.filter(
        (l) =>
          l.status ===
          "Follow-up"
      ).length;

    const converted =
      leads.filter(
        (l) =>
          l.status ===
          "Converted"
      ).length;

    const lost =
      leads.filter(
        (l) =>
          l.status === "Lost"
      ).length;

    const hot =
      leads.filter(
        (l) =>
          l.temperature ===
          "Hot"
      ).length;

    const conversionRate =
      total > 0
        ? Number(
            (
              (converted /
                total) *
              100
            ).toFixed(1)
          )
        : 0;

    const sourceStats = {};

    leads.forEach(
      (lead) => {
        sourceStats[
          lead.source
        ] =
          (sourceStats[
            lead.source
          ] || 0) + 1;
      }
    );

    const statusStats = {};

    leads.forEach(
      (lead) => {
        statusStats[
          lead.status
        ] =
          (statusStats[
            lead.status
          ] || 0) + 1;
      }
    );

    const recentLeads =
      [...leads]
        .sort(
          (a, b) =>
            new Date(
              b.created_at
            ) -
            new Date(
              a.created_at
            )
        )
        .slice(0, 5);

    res.json({
      success: true,
      analytics: {
        total,
        newLeads,
        contacted,
        followUps,
        converted,
        lost,
        hot,
        conversionRate,
        sourceStats,
        statusStats,
        recentLeads
      }
    });
  } catch (error) {
    console.error(
      "Analytics error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to load analytics."
    });
  }
};


module.exports = {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  addNote,
  getActivities,
  getAnalytics
};