import { supabase } from "./supabase.js";

/* =========================
   VARIABLES
========================= */
let productosCache = [];
let detalleCotizacion = [];
let totalCotizacion = 0;

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

  await cargarClientes();
  await cargarProductos();

  window.logoBase64 = await cargarImagenBase64("assets/img/logo.png");
});


/* =========================
   CLIENTES
========================= */
async function cargarClientes() {

  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre_contacto, empresa");

  if (error) {
    console.error(error);
    return;
  }

  const select = document.getElementById("clienteSelect");

  if (!select) return;

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

  const { data, error } = await supabase
    .from("productos")
    .select("id, nombre_producto, precio, unidad");

  if (error) {
    console.error(error);
    return;
  }

  productosCache = data;

  const select = document.getElementById("productoSelect");

  if (!select) return;

  select.innerHTML = `<option value="">-- Producto --</option>`;

  data.forEach(p => {

    const opt = document.createElement("option");

    opt.value = p.id;
    opt.textContent = p.nombre_producto;

    select.appendChild(opt);

  });

}


/* =========================
   AUTOLLENAR PRECIO Y UNIDAD
========================= */
document.addEventListener("change", e => {

  if (e.target.id === "productoSelect") {

    const prod = productosCache.find(p => p.id == e.target.value);

    if (prod) {

      document.getElementById("precio").value = prod.precio;
      document.getElementById("unidad").value = prod.unidad || "";

    }

  }

});


/* =========================
   AGREGAR PRODUCTO
========================= */
window.agregarProducto = function () {

  const prodSel = document.getElementById("productoSelect");

  const precio = Number(document.getElementById("precio").value);
  const unidad = document.getElementById("unidad").value;
  const cantidad = Number(document.getElementById("cantidad").value);

  if (!prodSel.value || !precio || !cantidad) {

    alert("⚠️ Complete producto, precio y cantidad");
    return;

  }

  const nombre = prodSel.options[prodSel.selectedIndex].text;

  const subtotal = precio * cantidad;

  detalleCotizacion.push({

    id: Date.now(),
    producto_id:productoSelect.value,
    nombre,
    precio,
    unidad,
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
      <td>$${formatoCOP(item.precio)}</td>
      <td>${item.unidad}</td>
      <td>${item.cantidad}</td>
      <td>$${formatoCOP(item.subtotal)}</td>
      <td><button class="eliminar-item" data-id="${item.id}">🗑️</button></td>
    `;

    tbody.appendChild(tr);

  });

  document.getElementById("totalCotizacion").textContent =
    formatoCOP(totalCotizacion);

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

    /* =========================
   GUARDAR DETALLE
========================= */

const detalles = detalleCotizacion.map(item => ({
  cotizacion_id: data.id,
  producto_id: item.producto_id,
  precio: item.precio,
  unidad: item.unidad,
  cantidad: item.cantidad,
  subtotal: item.subtotal
}));

const { data: detalleData, error: detalleError } = await supabase
  .from("detalle_cotizacion")
  .insert(detalles);

console.log("DETALLE INSERT:", detalleData);
console.log("DETALLE ERROR:", detalleError);

  const { blob, doc } = generarPDF(consecutivo, clienteSelect);

  const nombreArchivo = `Cotizacion_${consecutivo}.pdf`;

  doc.save(nombreArchivo);

  await supabase.storage
    .from("cotizaciones")
    .upload(nombreArchivo, blob, { upsert: true });

  const { data: publicData } = supabase
    .storage
    .from("cotizaciones")
    .getPublicUrl(nombreArchivo);

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

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const cliente = clienteSelect.selectedOptions[0].dataset.contacto || "—";
  const empresa = clienteSelect.selectedOptions[0].dataset.empresa || "—";

  const evento = document.getElementById("evento").value || "-";
  const ciudad = document.getElementById("ciudad").value || "-";
  const fechaSolicitud = document.getElementById("fechaSolicitud").value || "-";
  const fechaInicial = document.getElementById("fechaInicial").value || "-";
  const fechaFinal = document.getElementById("fechaFinal").value || "-";
  const formaPago = document.getElementById("formaPago").value || "-";

  const fecha = new Date().toLocaleDateString();

  let y = 20;

  /* =========================
     LOGO
  ========================= */

  if (window.logoBase64) {
    doc.addImage(window.logoBase64, "PNG", 10, 10, 45, 22);
  }

  /* =========================
     TITULO
  ========================= */

  doc.setFontSize(16);
  doc.text("COTIZACIÓN", 200, 20, { align: "right" });

  doc.setFontSize(10);
  doc.text(`No. ${consecutivo}`, 200, 28, { align: "right" });

  /* =========================
     LINEA SEPARADORA
  ========================= */

  y = 35;
  doc.line(10, y, 200, y);

  /* =========================
     DATOS CLIENTE
  ========================= */

  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(cliente, 35, y);

  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Empresa:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(empresa, 35, y);

  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(fecha, 35, y);

  y += 10;

  /* =========================
     DATOS EVENTO
  ========================= */

  doc.setFont("helvetica", "bold");
  doc.text("Evento:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(evento, 35, y);

  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Ciudad:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(ciudad, 35, y);

  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Fecha solicitud:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(fechaSolicitud, 45, y);

  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Fecha inicial:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(fechaInicial, 45, y);

  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Fecha final:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(fechaFinal, 45, y);

  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Forma de pago:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(formaPago, 45, y);

  y += 10;

  /* =========================
     CABECERA TABLA
  ========================= */

  doc.setFontSize(10);

  doc.rect(10, y, 190, 8);

  doc.text("Producto", 12, y + 5);
  doc.text("Precio", 100, y + 5, { align: "right" });
  doc.text("Unidad", 125, y + 5, { align: "right" });
  doc.text("Cant.", 150, y + 5, { align: "right" });
  doc.text("Subtotal", 190, y + 5, { align: "right" });

  y += 12;

  /* =========================
     DETALLE PRODUCTOS
  ========================= */

  detalleCotizacion.forEach((item, index) => {

    if (index % 2 === 0) {
      doc.setFillColor(240, 240, 240);
      doc.rect(10, y - 5, 190, 8, "F");
    }

    doc.text(item.nombre, 12, y);

    doc.text(`$${formatoCOP(item.precio)}`, 100, y, { align: "right" });

    doc.text(item.unidad || "-", 125, y, { align: "right" });

    doc.text(String(item.cantidad), 150, y, { align: "right" });

    doc.text(`$${formatoCOP(item.subtotal)}`, 190, y, { align: "right" });

    y += 9;

  });

  /* =========================
     TOTAL
  ========================= */

  y += 6;

  doc.line(120, y, 200, y);

  y += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");

  doc.text(`TOTAL: $${formatoCOP(totalCotizacion)}`, 190, y, { align: "right" });

  /* =========================
     PIE
  ========================= */

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  doc.setFontSize(8);

const nota = "NOTA: LOS DÍAS COTIZADOS SON POR 12 HORAS DE OPERACIÓN - INCLUYE CONDUCTOR Y COMBUSTIBLE. LAS HORAS ADICIONALES SERÁN COBRADAS BAJO REAL EJECUTADO AL FINALIZAR EL PROYECTO.";

const textoAjustado = doc.splitTextToSize(nota, 180);

doc.text(textoAjustado, 105, 285, { align: "center" });

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
  document.getElementById("unidad").value = "";
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