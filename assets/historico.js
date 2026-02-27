import { supabase } from "./supabase.js";

const tabla = document.getElementById("listaCotizaciones");
const filtroMes = document.getElementById("filtroMes");

window.cargarCotizaciones = async function () {
  tabla.innerHTML = "";

  let query = supabase
    .from("cotizaciones")
    .select("consecutivo, fecha, total, pdf_url")
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
    const linkPdf = c.pdf_url
      ? `<a href="${c.pdf_url}" target="_blank">📄 Ver PDF</a>`
      : "—";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.consecutivo}</td>
      <td>${c.fecha}</td>
      <td>$${Number(c.total).toFixed(2)}</td>
      <td>${linkPdf}</td>
    `;

    tabla.appendChild(tr);
  });
};

document.addEventListener("DOMContentLoaded", cargarCotizaciones);