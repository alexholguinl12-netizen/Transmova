import { supabase } from "./supabase.js";

const tabla = document.getElementById("listaCotizaciones");
const filtroMes = document.getElementById("filtroMes");

window.cargarCotizaciones = async function () {
  tabla.innerHTML = "";

  let query = supabase
    .from("cotizaciones")
    .select("id,consecutivo, fecha, total, pdf_url, parent_id1, version")
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
        <td colspan="4" style="text-align:center">No hay cotizaciones</td>
      </tr>`;
    return;
  }

  data.forEach(c => {

    const botonPdf = `
      <button onclick="verPDF('${c.id}')">📄</button>
    `;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.consecutivo}</td>
      <td>${c.fecha}</td>
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
    .select("consecutivo, fecha, total, pdf_url, version")
    .or(`id.eq.${baseId},parent_id1.eq.${baseId}`)
    .order("version", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  let contenido = "HISTORIAL:\n\n";

  data.forEach(item => {
    const tipo = item.version === 0
      ? "Original"
      : `Versión ${item.version}`;

    contenido += `${tipo} - ${item.consecutivo} - $${Number(item.total).toLocaleString("es-CO")}\n`;
  });

  alert(contenido);
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