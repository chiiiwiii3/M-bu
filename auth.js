import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://kjuuscbfpfctlfqvmdku.supabase.co";
const SUPABASE_KEY = "sb_publishable_F9VztDuW9Z18jf5wqn9XnA_Vp81l-nP";
const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = (id) => document.getElementById(id);
const panels = ["loginPanel", "signupPanel", "recoveryPanel", "updatePasswordPanel"];
const redirectTo = window.location.origin + window.location.pathname;

function screen(id) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  $(id)?.classList.add("active");
}
function panel(id, heading, sub) {
  panels.forEach((name) => $(name).classList.toggle("hidden", name !== id));
  $("authHeading").innerHTML = heading;
  document.querySelector("#auth > .sub").textContent = sub;
  $("authMessage").textContent = "";
  $("authMessage").classList.remove("error");
  screen("auth");
}
function message(text, error = false) {
  $("authMessage").textContent = text;
  $("authMessage").classList.toggle("error", error);
}
function busy(form, value) {
  const button = form.querySelector('button[type="submit"]');
  if (button) {
    button.disabled = value;
    button.dataset.originalText ??= button.textContent;
    button.textContent = value ? "PLEASE WAIT…" : button.dataset.originalText;
  }
}
function enterApp() {
  screen("home");
  $("archiveBtn").classList.remove("hidden");
  $("accountBtn").textContent = "SIGN OUT";
}
function enterAuth() {
  $("archiveBtn").classList.add("hidden");
  $("accountBtn").textContent = "SIGN IN";
  panel("loginPanel", "Welcome<br><em>back.</em>", "Sign in to keep your movie library with you.");
}

$("showSignup").addEventListener("click", () =>
  panel("signupPanel", "Make it<br><em>yours.</em>", "Create your free möbu account."));
$("showLoginFromSignup").addEventListener("click", enterAuth);
$("showRecovery").addEventListener("click", () =>
  panel("recoveryPanel", "Reset your<br><em>password.</em>", "Enter the email linked to your account."));
$("showLoginFromRecovery").addEventListener("click", enterAuth);

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  busy(form, true);
  message("");
  try {
    const username = $("loginUsername").value.trim().toLowerCase();
    const password = $("loginPassword").value;
    const { data, error } = await client.functions.invoke("username-sign-in", {
      body: { username, password }
    });
    if (error || !data?.access_token || !data?.refresh_token) {
      throw new Error("Username or password is incorrect.");
    }
    const { error: sessionError } = await client.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token
    });
    if (sessionError) throw sessionError;
    enterApp();
  } catch (error) {
    message(error.message || "Could not sign in. Try again.", true);
  } finally {
    busy(form, false);
  }
});

$("signupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  busy(form, true);
  message("");
  try {
    const username = $("signupUsername").value.trim().toLowerCase();
    const email = $("signupEmail").value.trim().toLowerCase();
    const password = $("signupPassword").value;
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      throw new Error("Use 3–24 letters, numbers, or underscores for your username.");
    }
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: redirectTo
      }
    });
    if (error) throw error;
    if (data.session) {
      enterApp();
      message("Your möbu account is ready.");
    } else {
      message("Account created. Check your email to confirm your account, then sign in with your username and password.");
      form.reset();
    }
  } catch (error) {
    message(error.message || "Could not create your account. Try again.", true);
  } finally {
    busy(form, false);
  }
});

$("recoveryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  busy(form, true);
  message("");
  try {
    const email = $("recoveryEmail").value.trim().toLowerCase();
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    message("If an account uses that email, a password-reset link will be sent. Check your inbox.");
  } catch (error) {
    message(error.message || "Could not request a reset link. Try again.", true);
  } finally {
    busy(form, false);
  }
});

$("updatePasswordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  busy(form, true);
  message("");
  try {
    const password = $("newPassword").value;
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
    history.replaceState({}, document.title, redirectTo);
    enterApp();
    message("Password updated successfully.");
  } catch (error) {
    message(error.message || "Could not update your password. Try again.", true);
  } finally {
    busy(form, false);
  }
});

$("accountBtn").addEventListener("click", async () => {
  const { data } = await client.auth.getSession();
  if (data.session) {
    await client.auth.signOut();
    enterAuth();
  } else {
    enterAuth();
  }
});

client.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    panel("updatePasswordPanel", "Choose a<br><em>new password.</em>", "Create a new password for your möbu account.");
  } else if (session) {
    enterApp();
  } else if (event === "SIGNED_OUT") {
    enterAuth();
  }
});

const { data: sessionData } = await client.auth.getSession();
if (window.location.hash.includes("type=recovery")) {
  panel("updatePasswordPanel", "Choose a<br><em>new password.</em>", "Create a new password for your möbu account.");
} else if (sessionData.session) {
  enterApp();
} else {
  enterAuth();
}

window.mobuAuth = { client };
