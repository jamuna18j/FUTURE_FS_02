import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowUpRight, BarChart3, Bell, CalendarClock,
  CheckCircle2, ChevronDown, Clock3, Filter, LayoutDashboard,
  LogOut, Menu, Moon, MoreHorizontal, Pencil, Plus, Search,
  Settings, ShieldCheck, Sparkles, Sun, Target, Trash2,
  TrendingUp, UserPlus, Users, X, Zap
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { api } from "./api";

const STATUS = ["New", "Contacted", "Follow-up", "Converted", "Lost"];
const SOURCES = [
  "Website", "Referral", "LinkedIn", "Instagram",
  "Facebook", "WhatsApp", "Other"
];

function normalizeStatus(value) {
  const status = String(value || "New").trim().toLowerCase();

  const map = {
    new: "New",
    contacted: "Contacted",
    "follow-up": "Follow-up",
    followup: "Follow-up",
    qualified: "Follow-up",
    converted: "Converted",
    lost: "Lost"
  };

  return map[status] || "New";
}

function normalizeLead(item = {}) {
  const l = item.lead || item.data || item;

  return {
    ...l,
    id: l.id || l.lead_id || l._id,
    name: l.name || "Unnamed lead",
    email: l.email || "",
    phone: l.phone || "",
    company: l.company || "",
    source: l.source || "Website",
    status: normalizeStatus(l.status),
    notes: l.notes || l.message || "",
    created_at: l.created_at || l.createdAt || new Date().toISOString(),
    follow_up_date: l.follow_up_date || l.follow_up || l.followUp || "",
    tags: l.tags || []
  };
}

function Auth({ onSuccess }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "", email: "", password: ""
  });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = mode === "login"
        ? await api.login({
            email: form.email,
            password: form.password
          })
        : await api.register(form);

      if (mode === "register") {
        setMode("login");
        setError("Account created. You can now sign in.");
        return;
      }

      const token =
        data?.session?.access_token ||
        data?.access_token ||
        data?.token;

      if (!token) {
        throw new Error("No access token returned. Please try signing in again.");
      }

      localStorage.setItem("leadflow_token", token);
      localStorage.setItem(
        "leadflow_user",
        JSON.stringify(data.user || {})
      );

      onSuccess(data.user || {});
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-glow glow-one" />
      <div className="auth-glow glow-two" />

      <div className="auth-card">
        <div className="brand-lockup">
          <div className="brand-mark"><Zap size={22} /></div>
          <div><b>LeadFlow</b><span>CRM</span></div>
        </div>

        <div className="auth-copy">
          <div className="eyebrow"><Sparkles size={14} /> Smart client management</div>
          <h1>{mode === "login" ? "Welcome back." : "Create your account."}</h1>
          <p>
            {mode === "login"
              ? "Manage leads, follow-ups and customer relationships in one place."
              : "Create your workspace and organize your potential customers."}
          </p>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <label>
              Name
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <div className="password-wrap">
              <input
                type={show ? "text" : "password"}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                minLength={6}
                placeholder="At least 6 characters"
                required
              />
              <button
                type="button"
                className="icon-btn inside"
                onClick={() => setShow(!show)}
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && (
            <div className={
              error.startsWith("Account created")
                ? "notice success"
                : "notice error"
            }>
              {error}
            </div>
          )}

          <button className="primary-btn wide" disabled={loading}>
            {loading ? "Please wait..." :
              mode === "login" ? "Sign in" : "Create account"}
            <ArrowUpRight size={17} />
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? "New to LeadFlow?" : "Already have an account?"}
          <button onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}>
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </div>

        <div className="secure-line">
          <ShieldCheck size={15} /> Secure authentication powered by Supabase
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("leadflow_user") || "null");
    } catch {
      return null;
    }
  });

  const [dark, setDark] = useState(
    () => localStorage.getItem("leadflow_dark") === "1"
  );
  const [leads, setLeads] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("dark", dark);
    localStorage.setItem("leadflow_dark", dark ? "1" : "0");
  }, [dark]);

  useEffect(() => {
    if (user) loadLeads();
  }, [user]);

  async function loadLeads() {
    setLoading(true);

    try {
      const data = await api.getLeads();
      const raw = Array.isArray(data)
        ? data
        : data.leads || data.data || [];

      setLeads(raw.map(normalizeLead));
    } catch (err) {
      showToast(err.message || "Unable to load leads.");
      if (/401|unauthorized|expired|invalid.*session/i.test(err.message || "")) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  }

  function logout() {
    localStorage.removeItem("leadflow_token");
    localStorage.removeItem("leadflow_user");
    setUser(null);
    setLeads([]);
  }

  if (!user) return <Auth onSuccess={setUser} />;

  const userName =
    user.name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <div className="app">
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <div className="side-top">
          <div className="brand-lockup">
            <div className="brand-mark"><Zap size={20} /></div>
            <div><b>LeadFlow</b><span>CRM</span></div>
          </div>
          <button className="icon-btn mobile-close" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>

        <div className="workspace">
          <div className="avatar">{userName[0]?.toUpperCase()}</div>
          <div><small>Workspace</small><strong>{userName}'s CRM</strong></div>
          <ChevronDown size={15} />
        </div>

        <nav>
          <NavItem icon={<LayoutDashboard />} label="Overview"
            active={tab === "dashboard"} onClick={() => { setTab("dashboard"); setMobile(false); }} />
          <NavItem icon={<Users />} label="All Leads"
            active={tab === "leads"} onClick={() => { setTab("leads"); setMobile(false); }}
            badge={leads.length} />
          <NavItem icon={<CalendarClock />} label="Follow-ups"
            active={tab === "followups"} onClick={() => { setTab("followups"); setMobile(false); }} />
          <NavItem icon={<BarChart3 />} label="Analytics"
            active={tab === "analytics"} onClick={() => { setTab("analytics"); setMobile(false); }} />
          <div className="nav-divider" />
          <NavItem icon={<Settings />} label="Settings"
            active={tab === "settings"} onClick={() => { setTab("settings"); setMobile(false); }} />
        </nav>

        <div className="sidebar-bottom">
          <div className="mini-tip">
            <Sparkles size={16} />
            <div><b>Smart tip</b><span>Follow up promptly to keep customers engaged.</span></div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span><b>/</b>
            <strong>{tab === "dashboard" ? "Overview" : tab[0].toUpperCase() + tab.slice(1)}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-btn" onClick={() => setDark(!dark)} title="Toggle theme">
              {dark ? <Sun /> : <Moon />}
            </button>
            <button className="icon-btn notification"><Bell /><i /></button>
            <div className="profile-chip">
              <div className="avatar small">{userName[0]?.toUpperCase()}</div>
              <span>{userName}</span>
            </div>
          </div>
        </header>

        <div className="content">
          {tab === "dashboard" && <Dashboard leads={leads} onAdd={() => setTab("leads")} />}
          {tab === "leads" && <LeadsPage leads={leads} setLeads={setLeads}
            loading={loading} toast={showToast} />}
          {tab === "followups" && <FollowUps leads={leads} onUpdate={async (id, body) => {
            try {
              await api.updateLead(id, body);
              await loadLeads();
              showToast("Lead updated successfully.");
            } catch (err) {
              showToast(err.message || "Could not update lead.");
            }
          }} />}
          {tab === "analytics" && <Analytics leads={leads} />}
          {tab === "settings" && <SettingsPage dark={dark} setDark={setDark} user={user} />}
        </div>
      </main>

      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      {icon}<span>{label}</span>
      {badge !== undefined && <em>{badge}</em>}
    </button>
  );
}

function Dashboard({ leads, onAdd }) {
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === "New").length,
    contacted: leads.filter(l => l.status === "Contacted").length,
    converted: leads.filter(l => l.status === "Converted").length
  };

  const rate = stats.total
    ? Math.round(stats.converted / stats.total * 100)
    : 0;

  const recent = [...leads]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const chart = STATUS.map(status => ({
    name: status,
    value: leads.filter(l => l.status === status).length
  }));

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Activity size={14} /> Live workspace</div>
          <h2>Good to see you.</h2>
          <p>Here's your customer pipeline at a glance.</p>
        </div>
        <button className="primary-btn" onClick={onAdd}><Plus size={18} /> Manage leads</button>
      </div>

      <div className="stat-grid">
        <Stat title="Total leads" value={stats.total} icon={<Users />} trend="All prospects" />
        <Stat title="New leads" value={stats.new} icon={<UserPlus />} trend="Not contacted yet" />
        <Stat title="Contacted" value={stats.contacted} icon={<Activity />} trend="In conversation" />
        <Stat title="Conversion rate" value={`${rate}%`} icon={<Target />} trend={`${stats.converted} converted`} />
      </div>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div><h3>Pipeline health</h3><p>Leads grouped by status</p></div>
            <span className="live-dot">LIVE</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="currentColor" fill="#8b83f6" fillOpacity={0.18} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel insight-panel">
          <div className="panel-head">
            <div><h3>Smart insight</h3><p>Based on your current leads</p></div>
            <Sparkles size={19} />
          </div>
          <div className="insight-number">{rate}%</div>
          <p className="insight-text">conversion rate across your leads.</p>
          <div className="insight-list">
            <div><span className="dot purple" /><b>{stats.new}</b><span>new leads</span></div>
            <div><span className="dot green" /><b>{stats.converted}</b><span>converted customers</span></div>
            <div><span className="dot orange" /><b>{stats.contacted}</b><span>contacted leads</span></div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div><h3>Recent leads</h3><p>Your latest customer entries</p></div>
          <button className="text-btn" onClick={onAdd}>Manage leads <ArrowUpRight size={15} /></button>
        </div>
        {recent.length ? <LeadRows leads={recent} /> : <EmptyState />}
      </section>
    </div>
  );
}

function Stat({ title, value, icon, trend }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{title}</span><strong>{value}</strong>
        <small><TrendingUp size={12} />{trend}</small>
      </div>
    </div>
  );
}

function LeadRows({ leads, onEdit, onDelete }) {
  return (
    <div className="lead-list">
      {leads.map(l => (
        <div className="lead-row" key={l.id || `${l.email}-${l.name}`}>
          <div className="lead-person">
            <div className="lead-avatar">{l.name?.[0]?.toUpperCase() || "L"}</div>
            <div><b>{l.name}</b><span>{l.email}</span></div>
          </div>
          <span className="source-pill">{l.source}</span>
          <StatusBadge status={l.status} />
          <span className="date">{formatDate(l.created_at)}</span>
          {(onEdit || onDelete) && (
            <div className="row-actions">
              <button className="icon-btn" title="Edit lead" onClick={() => onEdit(l)}><Pencil size={15} /></button>
              <button className="icon-btn danger-icon" title="Delete lead" onClick={() => onDelete(l)}><Trash2 size={15} /></button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const cssStatus = String(status || "New").toLowerCase().replace(/\s+/g, "-");
  return <span className={`status ${cssStatus}`}>{status || "New"}</span>;
}

function EmptyState() {
  return (
    <div className="empty">
      <div><Users /></div>
      <b>No leads found</b>
      <span>Add a lead or change your search and status filters.</span>
    </div>
  );
}

function LeadsPage({ leads, setLeads, loading, toast }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return leads.filter(l => {
      const matchesSearch = !q ||
        `${l.name} ${l.email} ${l.source} ${l.company || ""}`
          .toLowerCase().includes(q);

      const matchesStatus = filter === "all" ||
        l.status.toLowerCase() === filter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [leads, search, filter]);

  async function save(form) {
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone || "",
        company: form.company || "",
        source: form.source,
        status: normalizeStatus(form.status),
        follow_up_date: form.follow_up_date || null,
        notes: form.notes || "",
        message: form.notes || ""
      };

      if (editing) {
        const data = await api.updateLead(editing.id, payload);
        const updated = normalizeLead(data.lead || data.data || data);
        setLeads(prev => prev.map(l => l.id === editing.id ? updated : l));
        toast("Lead updated successfully.");
      } else {
        const data = await api.createLead(payload);
        const created = normalizeLead(data.lead || data.data || data);
        setLeads(prev => [created, ...prev.filter(l => l.id !== created.id)]);
        toast("Lead created successfully.");
      }

      setShowModal(false);
      setEditing(null);
    } catch (err) {
      toast(err.message || "Unable to save lead.");
    }
  }

  async function remove(lead) {
    if (!window.confirm(`Delete ${lead.name}?`)) return;

    try {
      await api.deleteLead(lead.id);
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      toast("Lead deleted.");
    } catch (err) {
      toast(err.message || "Unable to delete lead.");
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Users size={14} /> Client pipeline</div>
          <h2>All leads</h2>
          <p>Search clients and track their progress.</p>
        </div>
        <button className="primary-btn" onClick={() => { setEditing(null); setShowModal(true); }}>
          <Plus size={18} /> Add lead
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={17} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or source..." />
        </div>
        <div className="filter-box">
          <Filter size={16} />
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="panel-head">
          <div><h3>{filtered.length} leads</h3><p>Matching your current filters</p></div>
          <button className="icon-btn" type="button" aria-label="More options">
            <MoreHorizontal />
          </button>
        </div>
        {loading ? (
          <div className="empty"><b>Loading leads…</b></div>
        ) : filtered.length ? (
          <LeadRows
            leads={filtered}
            onEdit={l => { setEditing(l); setShowModal(true); }}
            onDelete={remove}
          />
        ) : <EmptyState />}
      </section>

      {showModal && (
        <LeadModal
          initial={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={save}
        />
      )}
    </div>
  );
}

function LeadModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial ? { ...initial } : {
    name: "",
    email: "",
    source: "Website",
    status: "New",
    notes: "",
    follow_up_date: ""
  });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <div className="eyebrow"><UserPlus size={14} /> {initial ? "Edit lead" : "New lead"}</div>
            <h3>{initial ? "Update client" : "Add a new client"}</h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}><X /></button>
        </div>

        <form onSubmit={submit} className="modal-form">
          <div className="form-grid">
            <label>Full name
              <input required value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>Email
              <input type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>Source
              <select value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>Status
              <select value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>Follow-up date
              <input type="date" value={form.follow_up_date || ""}
                onChange={e => setForm({ ...form, follow_up_date: e.target.value })} />
            </label>
          </div>

          <label>Notes
            <textarea rows="4" value={form.notes || ""}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Add context or next steps…" />
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button className="primary-btn" disabled={saving}>
              {saving ? "Saving…" : initial ? "Save changes" : "Create lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FollowUps({ leads, onUpdate }) {
  const due = leads
    .filter(l => l.follow_up_date || l.follow_up)
    .sort((a, b) => new Date(a.follow_up_date || a.follow_up) - new Date(b.follow_up_date || b.follow_up));

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow"><CalendarClock size={14} /> Keep momentum</div>
          <h2>Follow-ups</h2>
          <p>Never let a promising conversation go cold.</p>
        </div>
      </div>
      <section className="panel">
        {due.length ? (
          <div className="follow-grid">
            {due.map(l => (
              <div className="follow-card" key={l.id}>
                <div className="follow-top">
                  <div className="lead-avatar">{l.name?.[0] || "L"}</div>
                  <StatusBadge status={l.status} />
                </div>
                <h3>{l.name}</h3>
                <span>{l.email}</span>
                <div className="follow-date">
                  <Clock3 size={15} /> {formatDate(l.follow_up_date || l.follow_up)}
                </div>
                <button className="secondary-btn wide"
                  onClick={() => onUpdate(l.id, { status: "Contacted" })}>
                  Mark contacted
                </button>
              </div>
            ))}
          </div>
        ) : <EmptyState />}
      </section>
    </div>
  );
}

function Analytics({ leads }) {
  const sourceData = SOURCES.map(s => ({
    name: s,
    value: leads.filter(l => l.source === s).length
  }));
  const statusData = STATUS.map(s => ({
    name: s,
    value: leads.filter(l => l.status === s).length
  }));

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow"><BarChart3 size={14} /> Performance</div>
          <h2>Analytics</h2>
          <p>Understand where leads come from and how they move.</p>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-head"><h3>Leads by source</h3></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#7166e8" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel chart-panel">
          <div className="panel-head"><h3>Leads by status</h3></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#29a887" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsPage({ dark, setDark, user }) {
  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Settings size={14} /> Preferences</div>
          <h2>Settings</h2>
          <p>Manage your workspace preferences.</p>
        </div>
      </div>
      <section className="panel settings-panel">
        <div>
          <h3>Appearance</h3>
          <p>Choose the theme you prefer.</p>
        </div>
        <button className="secondary-btn" onClick={() => setDark(!dark)}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
          {dark ? "Switch to light mode" : "Switch to dark mode"}
        </button>
        <hr />
        <div>
          <h3>Account</h3>
          <p>{user?.email || "Signed-in user"}</p>
        </div>
      </section>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export default App;