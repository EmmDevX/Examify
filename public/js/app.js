const API_BASE = "/api";

async function api(path, opts = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: opts.method || "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      },
      body:
        opts.body && typeof opts.body === "object"
          ? JSON.stringify(opts.body)
          : opts.body,
    });

    if (res.status === 401) {
      window.location.href = "/sign-in.html";
      return null;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || `Error ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("API Error:", error);
    toast(error.message || "Something went wrong", "error");
    return null;
  }
}

async function requireAuth() {
  try {
    const res = await fetch("https://examify25.vercel.app/api/auth/me", {
      credentials: "include",
    });

    if (!res.ok) return null;

    return await res.json();
  } catch (error) {
    console.error("Auth Error:", error);
    return null;
  }
}

async function requireAdminUser() {
  const user = await requireAuth();
  if (!user) return null;

  if (user.role !== "admin") {
    window.location.href = "/dashboard.html";
    return null;
  }

  return user;
}

async function signOut() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    window.location.href = "/sign-in.html";
  } catch (error) {
    console.error("Logout Error:", error);
    toast("Failed to sign out", "error");
  }
}

function renderSidebar(activePage = "", isAdmin = false) {
  const pages = [
    { href: "/dashboard.html", label: "Dashboard", icon: "◫" },
    { href: "/quizzes.html", label: "Quizzes", icon: "📖" },
    { href: "/leaderboard.html", label: "Leaderboard", icon: "🏆" },
    { href: "/profile.html", label: "Profile", icon: "👤" },
  ];

  if (isAdmin) {
    pages.push({
      href: "/admin.html",
      label: "Admin Panel",
      icon: "⚙️",
    });
  }

  return `
    <div class="sidebar-logo">
      <div class="logo-icon">E</div>
      <span>Examify</span>
    </div>

    <nav class="sidebar-nav">
      ${pages
        .map(
          (p) => `
          <a href="${p.href}" class="nav-item ${
            activePage === p.href ? "active" : ""
          }">
            <span>${p.icon}</span>
            ${p.label}
          </a>
        `
        )
        .join("")}
    </nav>

    <div class="sidebar-footer">
      <button class="btn btn-secondary" style="width:100%" onclick="signOut()">
        ↩ Sign Out
      </button>
    </div>
  `;
}

function toast(msg, type = "info") {
  let el = document.getElementById("toast");

  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }

  el.textContent = msg;
  el.className = `toast ${type}`;

  requestAnimationFrame(() => {
    el.classList.add("show");
  });

  setTimeout(() => {
    el.classList.remove("show");
  }, 3000);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "flex";
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}

function loadingHTML(msg = "Loading...") {
  return `
    <div class="loading-center">
      <div class="spinner"></div>
      <span>${msg}</span>
    </div>
  `;
}