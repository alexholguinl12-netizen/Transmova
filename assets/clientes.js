import { supabase } from "./supabase.js";

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", async () => {

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  // 🔹 Cargar listado apenas abre la página
  cargarClientes();
});

/* =========================
   GUARDAR CLIENTE
========================= */
window.guardarCliente = async function () {
  const cliente = {
    nombre_contacto: nombre_contacto.value,
    empresa: empresa.value,
    telefono: telefono.value,
    email: email.value,
    telefono_contacto: telefono_contacto.value,
    nit: nit.value,
    ciudad: ciudad.value
  };

  const { error } = await supabase
    .from("clientes")
    .insert([cliente]);

  if (error) {
    alert("❌ Error al guardar cliente");
    return;
  }

  alert("✅ Cliente guardado");
  limpiarFormularioCliente();
  cargarClientes(); // 🔁 refresca lista
};

/* =========================
   UTIL
========================= */
function limpiarFormularioCliente() {
  [
    "nombre_contacto",
    "empresa",
    "telefono",
    "email",
    "telefono_contacto",
    "nit",
    "ciudad"
  ].forEach(id => document.getElementById(id).value = "");
}

/* =========================
   CARGAR CLIENTES
========================= */
async function cargarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre_contacto, empresa");

  if (error) {
    console.error(error);
    return;
  }

  const lista = document.getElementById("listaClientes");
  if (!lista) return;

  lista.innerHTML = "";

  data.forEach(c => {
    const li = document.createElement("li");
    li.textContent = `${c.nombre_contacto} - ${c.empresa ?? ""}`;
    lista.appendChild(li);
  });
}