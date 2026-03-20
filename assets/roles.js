import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {

  const link = document.getElementById("menuAprobaciones");

  if (!link) return; // si la página no tiene ese botón, no hace nada

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    link.style.display = "none";
    return;
  }

  const { data: rolData } = await supabase
    .from("usuarios_roles")
    .select("rol")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!rolData || rolData.rol !== "aprobador") {
    link.style.display = "none";
  }

});