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

  //  Cargar listado apenas abre la página
  cargarClientes();
});

/* =========================
   GUARDAR CLIENTE
========================= */
window.guardarCliente = async function () {

  const cliente = {
    nombre_contacto: document.getElementById("nombre_contacto").value,
    empresa: document.getElementById("empresa").value,
    telefono: document.getElementById("telefono").value,
    email: document.getElementById("email").value,
    telefono_contacto: document.getElementById("telefono_contacto").value,
    nit: document.getElementById("nit").value,
    ciudad: document.getElementById("ciudad").value,
    productor: document.getElementById("productor").value
  };

  let error;

  // 🔥 SI ESTÁ EDITANDO
  if (window.clienteEditando) {

    const res = await supabase
      .from("clientes")
      .update(cliente)
      .eq("id", window.clienteEditando);

    error = res.error;

    window.clienteEditando = null;

  } else {

    // 🔥 NUEVO
    const res = await supabase
      .from("clientes")
      .insert([cliente]);

    error = res.error;
  }

  if (error) {
    alert("❌ Error al guardar cliente");
    return;
  }

  mostrarMensaje("Cliente guardado correctamente", "ok");
  limpiarFormularioCliente();
  cargarClientes();
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
    "ciudad",
    "productor"
  ].forEach(id => document.getElementById(id).value = "");
}

/* =========================
   CARGAR CLIENTES
========================= */
async function cargarClientes() {
  const { data, error } = await supabase
    .from("clientes")
.select("*")
.eq("activo", true);

  if (error) {
    console.error(error);
    return;
  }

  const tabla = document.getElementById("tablaClientes");
  if (!tabla) return;

  tabla.innerHTML = "";

  data.forEach(c => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${c.nombre_contacto || "-"}</td>
      <td>${c.empresa || "-"}</td>
      <td>${c.productor || "-"}</td>
      <td>${c.email || "-"}</td>
      <td>${c.telefono || "-"}</td>
      <td>
        <button class="btn-editar" data-id="${c.id}">✏️</button>
        <button class="btn-eliminar" data-id="${c.id}">🗑️</button>
 
      </td>
    `;

    tabla.appendChild(tr);
  });

  console.log("DATA CLIENTES:", data);
}



function mostrarMensaje(texto, tipo) {
  const div = document.getElementById("mensaje");
  if (!div) return;

  div.textContent = texto;
  div.style.padding = "10px";
  div.style.marginTop = "10px";
  div.style.borderRadius = "6px";
  div.style.color = "white";

  if (tipo === "ok") {
    div.style.background = "#16a34a";
  } else {
    div.style.background = "#dc2626";
  }

  setTimeout(() => {
    div.textContent = "";
    div.style.background = "transparent";
  }, 3000);
}


document.addEventListener("click", async (e) => {

  /* =========================
     ELIMINAR
  ========================= */
 if (e.target.classList.contains("btn-eliminar")) {
  const id = e.target.dataset.id;

  if (!confirm("¿Desactivar cliente?")) return;

  const { error } = await supabase
    .from("clientes")
    .update({ activo: false })
    .eq("id", id);

  if (error) {
    alert("Error al desactivar");
    return;
  }

  cargarClientes();
}

  /* =========================
     EDITAR
  ========================= */
  if (e.target.classList.contains("btn-editar")) {

    const id = e.target.dataset.id;

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    // 🔥 llenar formulario
    document.getElementById("nombre_contacto").value = data.nombre_contacto || "";
    document.getElementById("empresa").value = data.empresa || "";
    document.getElementById("telefono").value = data.telefono || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("telefono_contacto").value = data.telefono_contacto || "";
    document.getElementById("nit").value = data.nit || "";
    document.getElementById("ciudad").value = data.ciudad || "";
    document.getElementById("productor").value = data.productor || "";

    // 🔥 guardar id en memoria
    window.clienteEditando = id;
  }

});