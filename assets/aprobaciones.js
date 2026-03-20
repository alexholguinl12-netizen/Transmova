document.addEventListener("DOMContentLoaded", async () => {

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const { data: rolData, error } = await supabase
    .from("usuarios_roles")
    .select("rol")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!rolData || rolData.rol !== "aprobador") {
    alert("⛔ No tienes permisos para esta pantalla");
    window.location.href = "Menu.html";
    return;
  }

  // si valida el login (solo aprobadores), entonces carga la tabla
});

import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {

  const { data, error } = await supabase
    .from("cotizaciones")
   .select(`
            id,
            consecutivo,
            total,
            estado,
            clientes(nombre_contacto, empresa),
            detalle_cotizacion( costo,  precio, cantidad  )
        `)
    .eq("estado", "pendiente");

  if (error) {
    console.error(error);
    return;
  }

  const tbody = document.getElementById("tablaAprobaciones");

  data.forEach(cot => {

    const tr = document.createElement("tr");
    let costoTotal = 0;
    let ventaTotal = 0;

    cot.detalle_cotizacion.forEach(d => {
  const costo = Number(d.costo || 0);
  const precio = Number(d.precio || 0);
  const cantidad = Number(d.cantidad || 0);

  costoTotal += costo * cantidad;
  ventaTotal += precio * cantidad;
});

    const rentabilidad = costoTotal > 0
  ? ((ventaTotal - costoTotal) / costoTotal) * 100
  : 0;

    const color = rentabilidad < 15 ? "red" : "green";

     const claseRent = rentabilidad < 15 ? "rent-baja" : "rent-alta";

console.log("ID:", cot.id);

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
    <button onclick="aprobar('${cot.id}')"">✅</button>
    <button onclick="rechazar(${cot.id})">❌</button>
  </td>
`;
    tbody.appendChild(tr);

  });

});

window.aprobar = async function(id) {

  try {

    // 1. marcar como aprobada
    const { error } = await supabase
      .from("cotizaciones")
      .update({
        estado: "aprobada",
        aprobada: true
      })
      .eq("id", id);

    if (error) throw error;

    // 2. enviar a cotización para generar PDF BIEN
    localStorage.setItem("generarPDFPendiente", id);

    window.location.href = "Cotizacion.html";

  } catch (err) {
    console.error(err);
    alert("❌ Error al aprobar");
  }
}; 

window.rechazar = async function(id) {

  try {

    const { error } = await supabase
      .from("cotizaciones")
      .update({
        estado: "rechazada",
        aprobada: false
      })
      .eq("id", id);

    if (error) throw error;

    alert("❌ Cotización rechazada");

    location.reload();

  } catch (err) {
    console.error(err);
    alert("Error al rechazar");
  }
};