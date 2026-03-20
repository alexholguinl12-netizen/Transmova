import { supabase } from "./supabase.js";

/* =========================
   VARIABLES
========================= */
let productoEditandoId = null;
let productosCache = [];

function formatoCOP(valor) {
  return Number(valor || 0).toLocaleString("es-CO");
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", async () => {

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  cargarProductos();
  cargarProveedoresSelect();
});

/* =========================
   CARGAR PRODUCTOS
========================= */
async function cargarProductos() {

  const { data, error } = await supabase
    .from("productos")
    .select(`*, proveedores (razon_social)`);

  if (error) {
    console.error(error);
    return;
  }

  productosCache = data;

  const tabla = document.getElementById("tablaProductos");
  if (!tabla) return;

  tabla.innerHTML = "";

  data.forEach(p => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.nombre_producto}</td>
      <td>$${formatoCOP(p.costo)}</td>
      <td>${p.unidad || "-"}</td>   
      <td>${p.proveedores?.razon_social || "-"}</td>
      <td>
        <button class="btn-editar" data-id="${p.id}">✏️</button>
        <button class="btn-eliminar" data-id="${p.id}">🗑️</button>
      </td>
    `;

    tabla.appendChild(tr);
  });
}

/* =========================
   EVENTOS BOTONES
========================= */
document.addEventListener("click", async (e) => {

  if (e.target.classList.contains("btn-editar")) {
    editarProducto(e.target.dataset.id);
  }

  if (e.target.classList.contains("btn-eliminar")) {
    eliminarProducto(e.target.dataset.id);
  }

});

/* =========================
   GUARDAR PRODUCTO
========================= */
window.guardarProducto = async function () {

  const producto = {
    nombre_producto: document.getElementById("nombre_producto").value,
    costo: document.getElementById("costo").value,
    unidad: document.getElementById("unidad").value,
    proveedor_id: document.getElementById("proveedorSelect").value
  };

  if (!producto.nombre_producto || !producto.costo) {
    alert("⚠️ Faltan datos");
    return;
  }

  if (productoEditandoId) {
    await supabase
      .from("productos")
      .update(producto)
      .eq("id", productoEditandoId);

    productoEditandoId = null;
  } else {
    await supabase
      .from("productos")
      .insert([producto]);
  }

  limpiarFormulario();
  cargarProductos();
};

/* =========================
   EDITAR PRODUCTO
========================= */
window.editarProducto = async function (id) {

  const { data } = await supabase
    .from("productos")
    .select("*")
    .eq("id", id)
    .single();

  document.getElementById("nombre_producto").value = data.nombre_producto;
  document.getElementById("costo").value = data.costo;
  document.getElementById("unidad").value = data.unidad;
  document.getElementById("proveedorSelect").value = data.proveedor_id;

  productoEditandoId = id;
};

/* =========================
   ELIMINAR PRODUCTO
========================= */
window.eliminarProducto = async function (id) {

  if (!confirm("¿Eliminar producto?")) return;

  await supabase
    .from("productos")
    .delete()
    .eq("id", id);

  cargarProductos();
};

/* =========================
   LIMPIAR FORMULARIO
========================= */
function limpiarFormulario() {
  document.getElementById("nombre_producto").value = "";
  document.getElementById("costo").value = "";
  document.getElementById("unidad").value = "";
  document.getElementById("proveedorSelect").value = "";
}

/* =========================
   PROVEEDORES SELECT
========================= */
async function cargarProveedoresSelect() {

  const { data, error } = await supabase
    .from("proveedores")
    .select("id, razon_social");

  if (error) {
    console.error(error);
    return;
  }

  const select = document.getElementById("proveedorSelect");

  if (!select) return;

  select.innerHTML = '<option value="">Seleccione proveedor</option>';

  data.forEach(p => {

    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.razon_social;

    select.appendChild(option);

  });
}

/* =========================
   ELIMINAR PRODUCTO
========================= */
window.eliminarProducto = async function (id) {
  if (!confirm("¿Eliminar producto?")) return;

  await supabase
    .from("productos")
    .delete()
    .eq("id", id);

  cargarProductos();
};
