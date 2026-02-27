import { supabase } from "./supabase.js";

async function logout() {
  await supabase.auth.signOut();
    window.location.href = "login.html";
}

window.logout = logout;