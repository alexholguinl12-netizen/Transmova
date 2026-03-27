import { supabase } from "./supabase.js";

const tabla = document.getElementById("listaCotizaciones");
const filtroMes = document.getElementById("filtroMes");

window.cargarCotizaciones = async function () {
  tabla.innerHTML = "";

  let query = supabase
    .from("cotizaciones")
    .select(`
  id,
  consecutivo,
  fecha,
  total,
  pdf_url,
  parent_id1,
  version,
  detalle_cotizacion(costo, precio, cantidad)
`)
    .eq("estado", "aprobada")
    .order("fecha", { ascending: false });

  if (filtroMes?.value) {
    const inicio = `${filtroMes.value}-01`;
    const fin = `${filtroMes.value}-31`;
    query = query.gte("fecha", inicio).lte("fecha", fin);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    tabla.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center">No hay cotizaciones</td>
      </tr>`;
    return;
  }

  data.forEach(c => {

    let costoTotal = 0;
let ventaTotal = 0;

c.detalle_cotizacion?.forEach(d => {
  costoTotal += (Number(d.costo) || 0) * (Number(d.cantidad) || 0);
  ventaTotal += (Number(d.precio) || 0) * (Number(d.cantidad) || 0);
});

const rentabilidad = costoTotal > 0
  ? ((ventaTotal - costoTotal) / costoTotal) * 100
  : 0;


    const botonPdf = `
      <button onclick="verPDF('${c.id}')">📄</button>
    `;

    const tr = document.createElement("tr");
   tr.innerHTML = `
  <td>${c.consecutivo}</td>
  <td>${c.fecha}</td>
  <td>$${costoTotal.toLocaleString("es-CO")}</td>
  <td>$${ventaTotal.toLocaleString("es-CO")}</td>
  <td>${rentabilidad.toFixed(2)} %</td>
  <td>$${Number(c.total).toLocaleString("es-CO")}</td>
  <td>${botonPdf}</td>
  <td>
    <button onclick='verHistorial(${JSON.stringify(c)})'>📜</button>
  </td>
`;

    tabla.appendChild(tr);
  });
};

document.addEventListener("DOMContentLoaded", cargarCotizaciones);

/* =========================
   VER HISTORIAL
========================= */

window.verHistorial = async function (cotizacion) {

  let baseId = cotizacion.parent_id1 || cotizacion.id;

  const { data, error } = await supabase
    .from("cotizaciones")
    .select(`
      consecutivo,
      fecha,
      total,
      version,
      detalle_cotizacion(costo, precio, cantidad)
    `)
    .or(`id.eq.${baseId},parent_id1.eq.${baseId}`)
    .order("version", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const contenedor = document.getElementById("contenidoHistorial");
  contenedor.innerHTML = "";

  data.forEach(item => {

    let costoTotal = 0;
    let ventaTotal = 0;

    item.detalle_cotizacion?.forEach(d => {
      costoTotal += (Number(d.costo) || 0) * (Number(d.cantidad) || 0);
      ventaTotal += (Number(d.precio) || 0) * (Number(d.cantidad) || 0);
    });

    const rentabilidad = costoTotal > 0
      ? ((ventaTotal - costoTotal) / costoTotal) * 100
      : 0;

    const tipo = item.version === 0
      ? "Original"
      : `Versión ${item.version}`;

    const clase = rentabilidad < 15 ? "baja" : "alta";

    const div = document.createElement("div");
    div.className = `card-historial ${clase}`;

    div.innerHTML = `
      <strong>${tipo}</strong><br>
      <b>Consecutivo:</b> ${item.consecutivo}<br>
      <b>Fecha:</b> ${item.fecha}<br>
      <b>Costo:</b> $${costoTotal.toLocaleString("es-CO")}<br>
      <b>Venta:</b> $${ventaTotal.toLocaleString("es-CO")}<br>
      <b>Rentabilidad:</b> ${rentabilidad.toFixed(2)} %<br>
      <b>Total:</b> $${Number(item.total).toLocaleString("es-CO")}
    `;

    contenedor.appendChild(div);
  });

  document.getElementById("modalHistorial").style.display = "block";
};

/* =========================
   VER PDF (VERSIÓN ESTABLE)
========================= */

window.verPDF = async function(id) {

  const { data, error } = await supabase
    .from("cotizaciones")
    .select("pdf_url")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    alert("Error al obtener el PDF");
    return;
  }

  if (!data.pdf_url) {
    alert("Esta cotización no tiene PDF");
    return;
  }

  window.open(data.pdf_url, "_blank");
};

window.cerrarModal = function () {
  document.getElementById("modalHistorial").style.display = "none";
};

window.onclick = function (event) {
  const modal = document.getElementById("modalHistorial");
  if (event.target === modal) {
    modal.style.display = "none";
  }
};