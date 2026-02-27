import { supabase } from "./supabase.js";

/* =========================
   VARIABLES
========================= */
let productosCache = [];
let detalleCotizacion = [];
let totalCotizacion = 0;

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  await cargarClientes();
  await cargarProductos();
  window.logoBase64 = await cargarImagenBase64("assets/img/logo.png");
});

/* =========================
   CLIENTES
========================= */
async function cargarClientes() {
  const { data } = await supabase
    .from("clientes")
    .select("id, nombre_contacto, empresa");

  const select = document.getElementById("clienteSelect");
  select.innerHTML = `<option value="">-- Seleccione cliente --</option>`;

  data.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.empresa || c.nombre_contacto;
    opt.dataset.empresa = c.empresa || "";
    opt.dataset.contacto = c.nombre_contacto || "";
    select.appendChild(opt);
  });
}

/* =========================
   PRODUCTOS
========================= */
async function cargarProductos() {
  const { data } = await supabase
    .from("productos")
    .select("id, nombre_producto, precio");

  productosCache = data;

  const select = document.getElementById("productoSelect");
  select.innerHTML = `<option value="">-- Producto --</option>`;

  data.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.nombre_producto;
    select.appendChild(opt);
  });
}

document.addEventListener("change", e => {
  if (e.target.id === "productoSelect") {
    const prod = productosCache.find(p => p.id == e.target.value);
    if (prod) document.getElementById("precio").value = prod.precio;
  }
});

/* =========================
   AGREGAR PRODUCTO
========================= */
window.agregarProducto = function () {
  const prodSel = document.getElementById("productoSelect");
  const precio = Number(document.getElementById("precio").value);
  const cantidad = Number(document.getElementById("cantidad").value);

  if (!prodSel.value || !precio || !cantidad) {
    alert("⚠️ Complete producto, precio y cantidad");
    return;
  }

  const nombre = prodSel.options[prodSel.selectedIndex].text;
  const subtotal = precio * cantidad;

  detalleCotizacion.push({
    id: Date.now(),
    nombre,
    precio,
    cantidad,
    subtotal
  });

  limpiarFormulario();
  renderDetalle();
};

/* =========================
   TABLA DETALLE
========================= */
function renderDetalle() {
  const tbody = document.getElementById("detalleCotizacion");
  tbody.innerHTML = "";
  totalCotizacion = 0;

  detalleCotizacion.forEach(item => {
    totalCotizacion += item.subtotal;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nombre}</td>
      <td>$${item.precio.toFixed(2)}</td>
      <td>${item.cantidad}</td>
      <td>$${item.subtotal.toFixed(2)}</td>
      <td><button class="eliminar-item" data-id="${item.id}">🗑️</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("totalCotizacion").textContent =
    totalCotizacion.toFixed(2);
}

document.addEventListener("click", e => {
  if (e.target.classList.contains("eliminar-item")) {
    const id = Number(e.target.dataset.id);
    detalleCotizacion = detalleCotizacion.filter(i => i.id !== id);
    renderDetalle();
  }
});

/* =========================
   CONSECUTIVO
========================= */
async function obtenerConsecutivoMensual() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const anio = hoy.getFullYear();

  const inicio = `${anio}-${mes}-01`;
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const fin = `${anio}-${mes}-${String(ultimoDia).padStart(2, "0")}`;

  const { count } = await supabase
    .from("cotizaciones")
    .select("*", { count: "exact", head: true })
    .gte("fecha", inicio)
    .lte("fecha", fin);

  return `${String(count + 1).padStart(2, "0")}-${mes}`;
}

/* =========================
   GUARDAR + PDF + STORAGE
========================= */
window.guardarCotizacion = async function () {
  const clienteSelect = document.getElementById("clienteSelect");
  if (!clienteSelect.value || detalleCotizacion.length === 0) {
    alert("⚠️ Seleccione cliente y agregue productos");
    return;
  }

  const consecutivo = await obtenerConsecutivoMensual();
  const fecha = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("cotizaciones")
    .insert([{
      cliente_id: clienteSelect.value,
      total: totalCotizacion,
      fecha,
      consecutivo
    }])
    .select()
    .single();

  const { blob, doc } = generarPDF(consecutivo, clienteSelect);
  const nombreArchivo = `Cotizacion_${consecutivo}.pdf`;

  // 🔹 descargar local
  doc.save(nombreArchivo);

  // 🔹 subir al bucket
  await supabase.storage
    .from("cotizaciones")
    .upload(nombreArchivo, blob, { upsert: true });

  // 🔹 obtener URL pública REAL
  const { data: publicData } = supabase
    .storage
    .from("cotizaciones")
    .getPublicUrl(nombreArchivo);

  // 🔹 guardar URL en la tabla
  await supabase
    .from("cotizaciones")
    .update({ pdf_url: publicData.publicUrl })
    .eq("id", data.id);

  alert(`✅ Cotización ${consecutivo} guardada`);
};

/* =========================
   PDF
========================= */
function generarPDF(consecutivo, clienteSelect) {

  console.log("jspdf:", window.jspdf);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const cliente = clienteSelect.selectedOptions[0].dataset.contacto || "—";
  const empresa = clienteSelect.selectedOptions[0].dataset.empresa || "—";
  const fecha = new Date().toLocaleDateString();

  let y = 20;

  /* ===== LOGO ===== */
  if (window.logoBase64) {
    doc.addImage(window.logoBase64, "PNG", 10, 10, 45, 22);
  }

  /* ===== TITULO ===== */
  doc.setFontSize(16);
  doc.text("COTIZACIÓN", 200, 20, { align: "right" });
  doc.setFontSize(11);
  doc.text(`No. ${consecutivo}`, 200, 27, { align: "right" });

  y = 45;
  doc.line(10, y, 200, y);
  y += 10;

  /* ===== DATOS ===== */
 /* doc.setFontSize(11);
 /*  doc.text(`Cliente: ${cliente}`, 10, y); y += 6;
  /* doc.text(`Empresa: ${empresa}`, 10, y); y += 6;
  /* doc.text(`Fecha: ${fecha}`, 10, y); y += 10; */

doc.setFontSize(11);

// Cliente
doc.setFont("helvetica", "bold");
doc.text("Cliente:", 10, y);
doc.setFont("helvetica", "normal");
doc.text(cliente, 35, y);
y += 6;

// Empresa
doc.setFont("helvetica", "bold");
doc.text("Empresa:", 10, y);
doc.setFont("helvetica", "normal");
doc.text(empresa, 35, y);
y += 6;

// Fecha
doc.setFont("helvetica", "bold");
doc.text("Fecha:", 10, y);
doc.setFont("helvetica", "normal");
doc.text(fecha, 35, y);
y += 10;


  /* ===== CABECERA TABLA ===== */
  doc.setFontSize(10);
  doc.rect(10, y, 190, 8);
  doc.text("Producto", 12, y + 5);
  doc.text("Precio", 110, y + 5, { align: "right" });
  doc.text("Cant.", 135, y + 5, { align: "right" });
  doc.text("Subtotal", 190, y + 5, { align: "right" });

  y += 20;

  /* ===== DETALLE ===== */
  detalleCotizacion.forEach(item => {
    doc.text(item.nombre, 12, y);
    doc.text(`$${item.precio.toFixed(2)}`, 110, y, { align: "right" });
    doc.text(String(item.cantidad), 135, y, { align: "right" });
    doc.text(`$${item.subtotal.toFixed(2)}`, 190, y, { align: "right" });
    y += 9;

    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  /* ===== TOTAL ===== */
  y += 6;
  doc.line(120, y, 200, y);
  y += 8;
  doc.setFontSize(12);
  doc.text(`TOTAL: $${totalCotizacion.toFixed(2)}`, 190, y, { align: "right" });

  /* ===== FOOTER ===== */
  doc.setFontSize(9);
  doc.text(
    "Documento generado automáticamente – Sistema de Cotizaciones",
    105,
    290,
    { align: "center" }
  );

return {
  doc,
  blob: doc.output("blob")
};
}
/* =========================
   UTIL
========================= */
function limpiarFormulario() {
  document.getElementById("productoSelect").value = "";
  document.getElementById("precio").value = "";
  document.getElementById("cantidad").value = "";
}

async function cargarImagenBase64(url) {
  const r = await fetch(url);
  const b = await r.blob();
  return new Promise(res => {
    const fr = new FileReader();
    fr.onloadend = () => res(fr.result);
    fr.readAsDataURL(b);
  });
}