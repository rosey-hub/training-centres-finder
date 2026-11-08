
const SUPABASE_URL = "https://hgewzbunfvtggnggttfe.supabase.co";
const SUPABASE_KEY = "sb_publishable_tW-F0gft1FQUh8hFX86nKw_-mjL9Mdg";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const authSection = document.getElementById("authSection");
const homeSection = document.getElementById("homeSection");
const authForm = document.getElementById("authForm");
const authMessage = document.getElementById("authMessage");
const nameGroup = document.getElementById("nameGroup");
const authSubmit = document.getElementById("authSubmit");
const logoutBtn = document.getElementById("logoutBtn");

let authMode = "login";
let currentPosition = null;
let allCentres = [];

document.getElementById("loginTab").addEventListener("click", () => {
  authMode = "login";
  updateAuthMode();
});

document.getElementById("registerTab").addEventListener("click", () => {
  authMode = "register";
  updateAuthMode();
});

function updateAuthMode() {
  document.getElementById("loginTab").classList.toggle("active", authMode === "login");
  document.getElementById("registerTab").classList.toggle("active", authMode === "register");
  nameGroup.classList.toggle("hidden", authMode === "login");
  authSubmit.textContent = authMode === "login" ? "Login" : "Create Account";
  authMessage.textContent = "";
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authMessage.textContent = "Please wait...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const fullName = document.getElementById("fullName").value.trim();

  try {
    if (authMode === "register") {
      if (!fullName) {
        authMessage.textContent = "Please enter your full name.";
        return;
      }

      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (error) throw error;

      authMessage.textContent = data.session
        ? "Registration successful."
        : "Registration successful. Check your email and confirm your account, then login.";
    } else {
      const { error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      authMessage.textContent = "Login successful.";
    }
  } catch (error) {
    authMessage.textContent = error.message;
  }
});

logoutBtn.addEventListener("click", async () => {
  const { error } = await db.auth.signOut();
  if (error) alert(error.message);
});

async function showApp(session) {
  if (session) {
    authSection.classList.add("hidden");
    homeSection.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    await loadCentres();
  } else {
    authSection.classList.remove("hidden");
    homeSection.classList.add("hidden");
    logoutBtn.classList.add("hidden");
  }
}

db.auth.onAuthStateChange((_event, session) => {
  showApp(session);
});

async function loadCentres() {
  const message = document.getElementById("centresMessage");
  message.textContent = "Loading training centres...";

  const { data, error } = await db
    .from("centres")
    .select("*")
    .order("name");

  if (error) {
    message.textContent = "Could not load centres: " + error.message;
    return;
  }

  allCentres = data || [];
  message.textContent = "";
  displayCentres(allCentres);
}

function displayCentres(centres) {
  const list = document.getElementById("centresList");
  document.getElementById("resultCount").textContent =
    `${centres.length} centre(s) found`;

  if (!centres.length) {
    list.innerHTML = "<p>No matching training centres found.</p>";
    return;
  }

  list.innerHTML = centres.map((centre) => {
    const courses = Array.isArray(centre.courses)
      ? centre.courses.join(", ")
      : "";

    const phone = centre.phone || "";
    const phoneLink = phone.replace(/[^\d+]/g, "");
    const destination = centre.maps_url ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(centre.address)}`;

    const navigationUrl = currentPosition
      ? `https://www.google.com/maps/dir/?api=1&origin=${currentPosition.latitude},${currentPosition.longitude}&destination=${encodeURIComponent(centre.address)}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(centre.address)}&travelmode=driving`;

    return `
      <article class="centre-card">
        <h3>${escapeHTML(centre.name)}</h3>
        <p><strong>Area:</strong> ${escapeHTML(centre.area || "")}</p>
        <p><strong>Courses:</strong>
          <span class="courses">${escapeHTML(courses)}</span>
        </p>
        <p><strong>Address:</strong> ${escapeHTML(centre.address || "")}</p>
        <p class="phone"><strong>Contact:</strong>
          ${phone
            ? `<a href="tel:${escapeHTML(phoneLink)}">${escapeHTML(phone)}</a>`
            : "Not available"}
        </p>
        <p><strong>Rating:</strong>
          ${centre.rating ? escapeHTML(String(centre.rating)) : "Not available"}
        </p>
        <a class="map-button" href="${escapeHTML(navigationUrl)}"
           target="_blank" rel="noopener">Start Navigation</a>
        <p><a href="${escapeHTML(destination)}" target="_blank"
           rel="noopener">View on Google Maps</a></p>
      </article>
    `;
  }).join("");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function searchCentres() {
  const location = document.getElementById("locationSearch").value
    .trim().toLowerCase();
  const course = document.getElementById("courseSearch").value
    .trim().toLowerCase();
  const name = document.getElementById("nameSearch").value
    .trim().toLowerCase();

  const filtered = allCentres.filter((centre) => {
    const areaText = `${centre.area || ""} ${centre.address || ""}`.toLowerCase();
    const courseText = (centre.courses || []).join(" ").toLowerCase();
    const nameText = (centre.name || "").toLowerCase();

    const locationMatch = !location || areaText.includes(location);
    const courseMatch = !course || courseText.includes(course);
    const nameMatch = !name || nameText.includes(name);

    return locationMatch && courseMatch && nameMatch;
  });

  displayCentres(filtered);
}

document.getElementById("searchBtn").addEventListener("click", searchCentres);
document.getElementById("courseSearch").addEventListener("input", searchCentres);
document.getElementById("nameSearch").addEventListener("input", searchCentres);

document.getElementById("gpsBtn").addEventListener("click", () => {
  const message = document.getElementById("locationMessage");

  if (!navigator.geolocation) {
    message.textContent = "Your browser does not support location.";
    return;
  }

  message.textContent = "Getting your current location...";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      message.textContent =
        "Your location is ready. Select a centre and click Start Navigation to get directions from your current location.";

      displayCentres(allCentres);
    },
    (error) => {
      message.textContent =
        "Location permission was not given or location is unavailable. Please allow location access in your browser.";
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
});

// Check whether the user already has an active login session.
async function startApp() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  await showApp(data.session);
}

startApp();
