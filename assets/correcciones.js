import { supabase } from "./supabase.js";
//import { formatearMoneda, limpiarMoneda } from "./utils.js";

window.buscarCotizacion = async function () {

  const consecutivo = document.getElementById("buscarConsecutivo").value;

  if (!consecutivo) {
    alert("Ingrese un consecutivo");
    return;
  }

  const { data, error } = await supabase
    .from("cotizaciones")
    .select(`*,clientes(empresa)`)
    .eq("consecutivo", consecutivo)
    .single();

  if (error || !data) {
    alert("❌ Cotización no encontrada");
    console.error(error);
    return;
  }

  mostrarCotizacion(data);

};

function mostrarCotizacion(c) {

  const div = document.getElementById("resultado");

  div.innerHTML = `
    <p><strong>Consecutivo:</strong> ${c.consecutivo}</p>
    <p><strong>Cliente:</strong> ${c.clientes?.empresa || "-"}</p>
    <p><strong>Total:</strong> $${Number(c.total).toLocaleString("es-CO")}</p>
    <p><strong>Evento:</strong> ${c.evento || "-"}</p>
    <p><strong>Ciudad:</strong> ${c.ciudad_ejecucion || "-"}</p>

    <button onclick='cargarParaEdicion(${JSON.stringify(c)})'>
      Cargar para corrección
    </button>
  `;

}

window.cargarParaEdicion = function (cotizacion) {

  // guardamos en localStorage para usar en la otra pantalla
  localStorage.setItem("cotizacionPadre", JSON.stringify(cotizacion));

  window.location.href = "Cotizacion.html";

};