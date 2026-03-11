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

  // 🔹 Cargar productos apenas abre la página
  cargarProductos();
});

/* =========================
   CARGAR PRODUCTOS
========================= */
async function cargarProductos() {
  const { data, error } = await supabase
    .from("productos")
    .select("*");

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
      <td>${formatoCOP(p.precio)}</td>
      <td>${p.unidad}</td>   
      <td>
        <button class="btn-editar" data-id="${p.id}">✏️</button>
        <button class="btn-eliminar" data-id="${p.id}">🗑️</button>
      </td>
    `;
    tabla.appendChild(tr);
  });
}

document.addEventListener("click", async (e) => {

  // ✏️ EDITAR
  if (e.target.classList.contains("btn-editar")) {
    const id = e.target.dataset.id;
    editarProducto(id);
  }

  // 🗑️ ELIMINAR
  if (e.target.classList.contains("btn-eliminar")) {
    const id = e.target.dataset.id;
    eliminarProducto(id);
  }

});




/* =========================
   GUARDAR PRODUCTO
========================= */
window.guardarProducto = async function () {
  const producto = {
    nombre_producto: nombre_producto.value,
    precio: precio.value,
    unidad: unidad.value
  };

  if (!producto.nombre_producto || !producto.precio) {
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

  nombre_producto.value = data.nombre_producto;
  precio.value = data.precio;
  unidad.value = data.unidad;

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