import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const { data: rolData } = await supabase
    .from("usuarios_roles")
    .select("rol")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!rolData || rolData.rol !== "aprobador") {
    alert("⛔ No tienes permisos para esta pantalla");
    window.location.href = "Menu.html";
    return;
  }

  cargarAprobaciones();
});

async function cargarAprobaciones() {

  const { data, error } = await supabase
    .from("cotizaciones")
    .select(`
      id,
      consecutivo,
      total,
      estado,
      clientes(nombre_contacto, empresa, productor),
      detalle_cotizacion(*, productos(nombre_producto))
    `)
    .eq("estado", "pendiente");

  if (error) {
    console.error(error);
    return;
  }

  const tbody = document.getElementById("tablaAprobaciones");
  tbody.innerHTML = "";

  data.forEach(cot => {

    let costoTotal = 0;
    let ventaTotal = 0;

    cot.detalle_cotizacion.forEach(d => {
      costoTotal += (Number(d.costo) || 0) * (Number(d.cantidad) || 0);
      ventaTotal += (Number(d.precio) || 0) * (Number(d.cantidad) || 0);
    });

    const rentabilidad = costoTotal > 0
      ? ((ventaTotal - costoTotal) / costoTotal) * 100
      : 0;

    const claseRent = rentabilidad < 15 ? "rent-baja" : "rent-alta";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="celda-centro">${cot.consecutivo}</td>
      <td>${cot.clientes?.empresa || cot.clientes?.nombre_contacto || "-"}</td>
      <td class="celda-numero">$${costoTotal.toLocaleString()}</td>
      <td class="celda-numero">$${ventaTotal.toLocaleString()}</td>
      <td class="celda-centro ${claseRent}">
        ${rentabilidad.toFixed(2)} %
      </td>
      <td class="celda-numero">$${Number(cot.total).toLocaleString()}</td>
      <td class="celda-centro">
        <button onclick="aprobar('${cot.id}')">✅</button>
        <button onclick="rechazar('${cot.id}')">❌</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* =========================
   ACCIONES
========================= */

window.aprobar = async function(id) {

  const { error } = await supabase
    .from("cotizaciones")
    .update({
      estado: "aprobada",
      aprobada: true
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("❌ Error al aprobar");
    return;
  }

  localStorage.setItem("generarPDFPendiente", id);
  window.location.href = "Cotizacion.html";
};

window.rechazar = async function(id) {

  const { error } = await supabase
    .from("cotizaciones")
    .update({
      estado: "rechazada",
      aprobada: false
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Error al rechazar");
    return;
  }

  alert("❌ Cotización rechazada");
  location.reload();
};