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
   CLIENTES
========================= */
async function cargarClientes() {

  const { data, error } = await supabase
  .from("clientes")
.select("id, nombre_contacto, empresa, productor")
.eq("activo", true);

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
    opt.textContent = `${c.empresa || c.nombre_contacto} [${c.productor || "Sin Productor"}]`;
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
    .select("id, nombre_producto, costo, descripcion, proveedor_id");

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

    if (!prod) return;

    const costoInput = document.getElementById("costo");
    const unidadInput = document.getElementById("descripcion");

    if (costoInput) costoInput.value = prod.costo || 0;
    if (unidadInput) unidadInput.value = prod.descripcion || "";

  }

});


/* =========================
   FILTRAR PRODUCTOS POR PROVEEDOR
========================= */
document.addEventListener("change", (e) => {

  if (e.target.id === "proveedorSelect") {

    const proveedorId = e.target.value;

    const selectProductos = document.getElementById("productoSelect");

    // limpiar productos
    selectProductos.innerHTML = `<option value="">-- Producto --</option>`;

    const filtrados = proveedorId
      ? productosCache.filter(p => p.proveedor_id == proveedorId)
      : productosCache;

    filtrados.forEach(p => {

      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.nombre_producto;

      selectProductos.appendChild(opt);

    });

    // 🔥 BONUS: limpiar selección previa
    selectProductos.value = "";

  }

});

/* =========================
   CALCULAR RENTABILIDAD
========================= */

document.addEventListener("input", (e) => {

  if (e.target.id === "venta") {

const costo = Number(
  document.getElementById("costo").value.replace(/\./g, "")
);
    const venta = Number( e.target.value.replace(/\./g, "")
);

    if (!costo || !venta) {
      document.getElementById("rentabilidad").value = "";
      return;
    }

    const utilidad = venta - costo;
    const porcentaje = (utilidad / costo) * 100;

    document.getElementById("rentabilidad").value =
      porcentaje.toFixed(2) + " %";
  }

});

/* =========================
   AGREGAR PRODUCTO
========================= */
window.agregarProducto = function () {
  const prodSel = document.getElementById("productoSelect");
  const costo = Number(document.getElementById("costo").value);
  const venta = Number(document.getElementById("venta").value);
  const descripcion = document.getElementById("descripcion").value;
  const cantidad = Number(document.getElementById("cantidad").value);

  if (!prodSel.value || !venta || !cantidad) {
    alert("⚠️ Complete producto, venta y cantidad");
    return;
  }

  const nombre = prodSel.options[prodSel.selectedIndex].text;
  const subtotal = venta * cantidad;

  detalleCotizacion.push({
    id: Date.now(),
    producto_id: prodSel.value,
    nombre,
    costo,
    precio: venta, // importante: guardamos venta como precio
    descripcion,
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
      <td>${item.descripcion}</td>
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

  const { count, error } = await supabase
    .from("cotizaciones")
    .select("*", { count: "exact", head: true })
    .gte("fecha", inicio)
    .lte("fecha", fin);

  if (error) {
    console.error(error);
    return "01-" + mes;
  }

  return `${String(count + 1).padStart(2, "0")}-${mes}`;
}
/* =========================
   GUARDAR + PDF + STORAGE
========================= */
window.guardarCotizacion = async function () {
const rentabilidadMinima = 15;
const tieneBajaRentabilidad = detalleCotizacion.some(item => {
  const porcentaje = ((item.precio - item.costo) / item.costo) * 100;
  return porcentaje < rentabilidadMinima;
});

  const clienteSelect = document.getElementById("clienteSelect");
  if (!clienteSelect.value || detalleCotizacion.length === 0) {
    alert("⚠️ Seleccione cliente y agregue productos");
    return;
  }

let consecutivo;
let parent_id1 = null;
let version = 0;

//  SI ES CORRECCIÓN
if (window.cotizacionPadre) {
   await guardarCorreccion (window.cotizacionPadre);
   return;
 
} else {
  //  normal
  consecutivo = await obtenerConsecutivoMensual();
}

  const fecha = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("cotizaciones")
   .insert([{
  cliente_id: clienteSelect.value,
  total: totalCotizacion,
  fecha,
  consecutivo,
  evento: document.getElementById("evento").value,
  fecha_inicial: document.getElementById("fechaInicial").value,
  fecha_final: document.getElementById("fechaFinal").value,
  ciudad_ejecucion: document.getElementById("ciudad").value,
  fecha_solicitud: document.getElementById("fechaSolicitud").value,
  forma_pago: document.getElementById("formaPago").value,
  parent_id1: parent_id1,
  version: version,
  estado: tieneBajaRentabilidad ? "pendiente" : "aprobada",
  aprobada: !tieneBajaRentabilidad,
  requiere_aprobacion: tieneBajaRentabilidad
}])
    .select()
    .single();

    if (error) {
  console.error("❌ ERROR INSERT:", error);
  alert("Error al guardar cotización");
  return;
}

    /* =========================
   GUARDAR DETALLE
========================= */

const detalles = detalleCotizacion.map(item => ({
  cotizacion_id: data.id,
  producto_id: item.producto_id,
  precio: item.precio,
  descripcion: item.descripcion,
  cantidad: item.cantidad,
  subtotal: item.subtotal,
  costo: item.costo
}));

const { data: detalleData, error: detalleError } = await supabase
  .from("detalle_cotizacion")
  .insert(detalles);
  console.log("DETALLE INSERT:", detalleData);
  console.log("DETALLE ERROR:", detalleError);

if (tieneBajaRentabilidad) {

  await fetch("https://edghbquwmwmmllkagfah.supabase.co/functions/v1/clever-endpoint", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ2hicXV3bXdtbWxsa2FnZmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDU0NzksImV4cCI6MjA4NjkyMTQ3OX0.o8f_7Mv40nU-U6R--dSun7_yvKzDLonQBJSRwgB46ig"
    },
    body: JSON.stringify({
      consecutivo,
      total: totalCotizacion
    })
  });

  alert("⚠️ Cotización enviada a aprobación");
  return;
}

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
window.generarPDF = function (consecutivo, clienteSelect) {

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
   CABECERA TABLA (ALINEADA PRO)
========================= */

doc.setFontSize(10);
doc.setFont("helvetica", "bold");
doc.rect(10, y, 190, 8);
// 🔹 mismos puntos que el detalle
doc.text("Producto", 12, y + 5);
doc.text("Precio", 95, y + 5, { align: "right" });
doc.text("Descripción", 100, y + 5);
doc.text("Cant.", 160, y + 5, { align: "right" });
doc.text("Subtotal", 195, y + 5, { align: "right" });
doc.setFont("helvetica", "normal");
  y += 12;
 /* =========================
   DETALLE PRODUCTOS 
========================= */

detalleCotizacion.forEach((item, index) => {

  // 🔹 dividir textos
  const nombre = doc.splitTextToSize(item.nombre || "-", 35);
  const descripcion = doc.splitTextToSize(item.descripcion || "-", 50);

  const lineas = Math.max(nombre.length, descripcion.length, 1);
  const alturaFila = lineas * 5;

  // 🔹 salto de página automático
  if (y + alturaFila > 270) {
    doc.addPage();
    y = 20;
  }

  // 🔹 fondo alterno
  if (index % 2 === 0) {
    doc.setFillColor(240, 240, 240);
    doc.rect(10, y - 4, 190, alturaFila + 4, "F");
  }

  // 🔹 columnas alineadas
  doc.text(nombre, 12, y);
  doc.text(`$${formatoCOP(item.precio)}`, 95, y, { align: "right" });
  doc.text(descripcion, 100, y);
  doc.text(String(item.cantidad), 160, y, { align: "right" });
  doc.text(`$${formatoCOP(item.subtotal)}`, 195, y, { align: "right" });

  y += alturaFila + 4;

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
    const nota = "Por favor hacer transferencia a: Cuenta Ahorros N° 743-000034-00 De Bancolombia a Nombre de TRANSMOVA S.A.S. Nit 901.860.451-6";
    const nota1 = "NOTA: LOS DÍAS COTIZADOS SON POR 12 HORAS DE OPERACIÓN - INCLUYE CONDUCTOR Y COMBUSTIBLE. LAS HORAS ADICIONALES SERÁN COBRADAS BAJO REAL EJECUTADO AL FINALIZAR EL PROYECTO.";
    const textoAjustado = doc.splitTextToSize(nota, 180);
    const textoAjustado1 = doc.splitTextToSize(nota1, 180);
  doc.text(textoAjustado, 105, 275, { align: "center" });
  doc.text(textoAjustado1, 105, 285, { align: "center" });
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
  document.getElementById("costo").value = "";
  document.getElementById("descripcion").value = "";
  document.getElementById("cantidad").value = "";
  document.getElementById("costo").value = "";
  document.getElementById("venta").value = "";
  document.getElementById("rentabilidad").value = "";

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

window.guardarCorreccion = async function (cotizacionPadre) {
  // 1. contar cuántas correcciones ya existen
  const { count } = await supabase
    .from("cotizaciones")
    .select("*", { count: "exact", head: true })
    .eq("parent_id1", cotizacionPadre.id);
  const numeroCorreccion = count + 1;
  // 2. nuevo consecutivo
  const consecutivo = `${cotizacionPadre.consecutivo}-${String(numeroCorreccion).padStart(2, "0")}`;
  const fecha = new Date().toISOString().split("T")[0];
  // 3. guardar nueva cotización (HIJO)
  const { data } = await supabase
    .from("cotizaciones")
    .insert([{
      cliente_id: cotizacionPadre.cliente_id,
      total: totalCotizacion,
      fecha,
      consecutivo,
      evento: document.getElementById("evento").value,
      fecha_inicial: document.getElementById("fechaInicial").value,
      fecha_final: document.getElementById("fechaFinal").value,
      ciudad_ejecucion: document.getElementById("ciudad").value,
      fecha_solicitud: document.getElementById("fechaSolicitud").value,
      forma_pago: document.getElementById("formaPago").value,
      parent_id1: cotizacionPadre.id,
      version: numeroCorreccion
    }])
    .select()
    .single();

  /* =========================
     PDF
  ========================= */

  const clienteSelect = document.getElementById("clienteSelect");
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
  alert(`✅ Corrección ${consecutivo} guardada`);
};

document.addEventListener("DOMContentLoaded", async () => {

  /* =========================
     SESIÓN
  ========================= */

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  /* =========================
     LIMPIEZA INICIAL
  ========================= */

  const vieneDeCorreccion = localStorage.getItem("cotizacionPadre");
  if (!vieneDeCorreccion) {
    detalleCotizacion = [];
    totalCotizacion = 0;
    const tabla = document.getElementById("detalleCotizacion");
    const total = document.getElementById("totalCotizacion");
    if (tabla) tabla.innerHTML = "";
    if (total) total.textContent = "0";
  }

  /* =========================
     CARGAS (CRÍTICO PRIMERO)
  ========================= */

  await cargarClientes();
  await cargarProveedores();
  await cargarProductos();
  window.logoBase64 = await cargarImagenBase64("assets/img/logo.png");
  /* =========================
     CARGAR CORRECCIÓN
  ========================= */
  const data = localStorage.getItem("cotizacionPadre");
  if (data) {
    const cotizacion = JSON.parse(data);
    localStorage.removeItem("cotizacionPadre");
    window.cotizacionPadre = cotizacion;
    const clienteSelect = document.getElementById("clienteSelect");
    if (clienteSelect) {
      clienteSelect.value = cotizacion.cliente_id;
      clienteSelect.dispatchEvent(new Event("change"));
    }
    document.getElementById("evento").value = cotizacion.evento || "";
    document.getElementById("ciudad").value = cotizacion.ciudad_ejecucion || "";
    document.getElementById("fechaSolicitud").value = cotizacion.fecha_solicitud || "";
    document.getElementById("fechaInicial").value = cotizacion.fecha_inicial || "";
    document.getElementById("fechaFinal").value = cotizacion.fecha_final || "";
    document.getElementById("formaPago").value = cotizacion.forma_pago || "";
    const { data: detalles, error } = await supabase
      .from("detalle_cotizacion")
      .select(`
        *,
        productos(nombre_producto)
      `)
      .eq("cotizacion_id", cotizacion.id);
    if (error) {
      console.error("Error cargando detalle:", error);
    } else {
      detalleCotizacion = [];
      detalles.forEach((d, index) => {
        detalleCotizacion.push({
          id: index,
          producto_id: d.producto_id,
          nombre: d.productos?.nombre_producto || "Producto",
          precio: d.precio,
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          subtotal: d.subtotal
        });

      });

      renderDetalle();
    }
  }
/* =========================
   GENERAR PDF DESDE APROBACIÓN
========================= */

const idPendiente = localStorage.getItem("generarPDFPendiente");
if (idPendiente) {
  // 🔥 limpiar para que no se repita
  localStorage.removeItem("generarPDFPendiente");
  // traer cotización completa
  const { data: cot, error } = await supabase
    .from("cotizaciones")
    .select(`
  *,
  clientes(nombre_contacto, empresa, productor),
  detalle_cotizacion(*, productos(nombre_producto))
`)
    .eq("id", idPendiente)
    .single();

  if (error) {
    console.error(error);
    return;
  }
  const clienteSelect = document.getElementById("clienteSelect");
  // simular selección de cliente
  if (clienteSelect) {
    clienteSelect.value = cot.cliente_id;
  }

//  llenar formulario (CLAVE)
document.getElementById("evento").value = cot.evento || "";
document.getElementById("ciudad").value = cot.ciudad_ejecucion || "";
document.getElementById("fechaSolicitud").value = cot.fecha_solicitud || "";
document.getElementById("fechaInicial").value = cot.fecha_inicial || "";
document.getElementById("fechaFinal").value = cot.fecha_final || "";
document.getElementById("formaPago").value = cot.forma_pago || "";

  // reconstruir detalle para que tu PDF salga IGUAL al original
    detalleCotizacion = cot.detalle_cotizacion.map((d, i) => ({
    id: i,
    nombre: d.productos?.nombre_producto || "Producto", // 🔥 FIX
    precio: d.precio,
    descripcion: d.descripcion,
    cantidad: d.cantidad,
    subtotal: d.subtotal
  }));

  totalCotizacion = detalleCotizacion.reduce((acc, i) => acc + i.subtotal, 0);
  const { blob, doc } = generarPDF(cot.consecutivo, clienteSelect);
  const nombreArchivo = `Cotizacion_${cot.consecutivo}.pdf`;
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
    .eq("id", cot.id);
  alert("✅ PDF generado automáticamente");
}
});


async function cargarProveedores() {

  const { data, error } = await supabase
    .from("proveedores")
    .select("id, razon_social");

  if (error) {
    console.error(error);
    return;
  }

  const select = document.getElementById("proveedorSelect");

  if (!select) return;

  select.innerHTML = `<option value="">-- Seleccione proveedor --</option>`;

  data.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.razon_social;
    select.appendChild(opt);
  });

}