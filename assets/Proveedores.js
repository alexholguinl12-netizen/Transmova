import { supabase } from "./supabase.js";

let proveedorEditandoId = null;

/* =========================
   GUARDAR / ACTUALIZAR
========================= */
window.guardarProveedor = async function () {

  const proveedor = {
    razon_social: document.getElementById("razon_social").value,
    nit: document.getElementById("nit").value,
    telefono_empresa: document.getElementById("telefono_empresa").value,
    nombre_contacto: document.getElementById("nombre_contacto").value,
    telefono_contacto: document.getElementById("telefono_contacto").value
  };

  if (!proveedor.razon_social) {
    alert("⚠️ Falta razón social");
    return;
  }

  if (proveedorEditandoId) {
    await supabase
      .from("proveedores")
      .update(proveedor)
      .eq("id", proveedorEditandoId);

    proveedorEditandoId = null;
  } else {
    await supabase
      .from("proveedores")
      .insert([proveedor]);
  }

  limpiarFormulario();
  cargarProveedores();
};

/* =========================
   CARGAR PROVEEDORES
========================= */
async function cargarProveedores() {

  const { data, error } = await supabase
    .from("proveedores")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  const tabla = document.getElementById("tablaProveedores");
  if (!tabla) return;

  tabla.innerHTML = "";

  data.forEach(p => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.razon_social}</td>
      <td>${p.nit || "-"}</td>
      <td>${p.telefono_empresa || "-"}</td>
      <td>
        <button class="btn-editar" data-id="${p.id}">✏️</button>
        <button class="btn-eliminar" data-id="${p.id}">🗑️</button>
      </td>
    `;

    tabla.appendChild(tr);

  });
}

/* =========================
   EVENTOS
========================= */
document.addEventListener("click", async (e) => {

  if (e.target.classList.contains("btn-editar")) {
    editarProveedor(e.target.dataset.id);
  }

  if (e.target.classList.contains("btn-eliminar")) {
    eliminarProveedor(e.target.dataset.id);
  }

});

/* =========================
   EDITAR
========================= */
async function editarProveedor(id) {

  const { data } = await supabase
    .from("proveedores")
    .select("*")
    .eq("id", id)
    .single();

  document.getElementById("razon_social").value = data.razon_social;
  document.getElementById("nit").value = data.nit;
  document.getElementById("telefono_empresa").value = data.telefono_empresa;
  document.getElementById("nombre_contacto").value = data.nombre_contacto;
  document.getElementById("telefono_contacto").value = data.telefono_contacto;

  proveedorEditandoId = id;
}

/* =========================
   ELIMINAR
========================= */
async function eliminarProveedor(id) {

  if (!confirm("¿Eliminar proveedor?")) return;

  await supabase
    .from("proveedores")
    .delete()
    .eq("id", id);

  cargarProveedores();
}

/* =========================
   LIMPIAR
========================= */
function limpiarFormulario() {
  document.getElementById("razon_social").value = "";
  document.getElementById("nit").value = "";
  document.getElementById("telefono_empresa").value = "";
  document.getElementById("nombre_contacto").value = "";
  document.getElementById("telefono_contacto").value = "";
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", cargarProveedores);