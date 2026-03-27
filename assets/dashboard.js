import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  cargarDashboard();
});

async function cargarDashboard() {

  const { data, error } = await supabase
    .from("cotizaciones")
    .select(`
      id,
      fecha,
      total,
      detalle_cotizacion(costo, precio, cantidad)
    `)
    .eq("estado", "aprobada");

  if (error) {
    console.error(error);
    return;
  }

  const hoy = new Date();
  const mesActual = hoy.toISOString().substring(0, 7);

  const fechaAnterior = new Date();
  fechaAnterior.setMonth(fechaAnterior.getMonth() - 1);
  const mesAnterior = fechaAnterior.toISOString().substring(0, 7);

  let totalVentas = 0;
  let totalCostos = 0;

  let ventasActual = 0;
  let costosActual = 0;

  let ventasAnterior = 0;
  let costosAnterior = 0;

  let rentabilidades = [];

  const ventasPorMes = {};

  data.forEach(c => {

    let costo = 0;
    let venta = 0;

    c.detalle_cotizacion?.forEach(d => {
      costo += (d.costo || 0) * (d.cantidad || 0);
      venta += (d.precio || 0) * (d.cantidad || 0);
    });

    totalCostos += costo;
    totalVentas += venta;

    const mes = c.fecha.substring(0, 7);

    // 📊 agrupación para gráfico
    if (!ventasPorMes[mes]) {
      ventasPorMes[mes] = 0;
    }
    ventasPorMes[mes] += venta;

    // 📈 rentabilidad individual
    if (costo > 0) {
      rentabilidades.push(((venta - costo) / costo)*100);
    }

    // 📅 mes actual
    if (mes === mesActual) {
      ventasActual += venta;
      costosActual += costo;
    }

    // 📅 mes anterior
    if (mes === mesAnterior) {
      ventasAnterior += venta;
      costosAnterior += costo;
    }

  });

  // 🔥 KPI PRINCIPAL
  const rentabilidadGlobal = totalCostos > 0
    ? ((totalVentas - totalCostos) / totalCostos) * 100
    : 0;

  const rentabilidadActual = costosActual > 0
    ? ((ventasActual - costosActual) / costosActual) * 100
    : 0;

  const rentabilidadAnterior = costosAnterior > 0
    ? ((ventasAnterior - costosAnterior) / costosAnterior) * 100
    : 0;

  const variacion = rentabilidadActual - rentabilidadAnterior;

  const promedioRentabilidad = rentabilidades.length > 0
    ? (rentabilidades.reduce((a, b) => a + b, 0) / rentabilidades.length) 
    : 0;

  // 🎯 KPIs UI
  document.getElementById("kpiVentas").textContent =
    "$" + totalVentas.toLocaleString("es-CO");

  document.getElementById("kpiCostos").textContent =
    "$" + totalCostos.toLocaleString("es-CO");

  document.getElementById("kpiRentabilidad").textContent =
    rentabilidadGlobal.toFixed(2) + "%";

  document.getElementById("kpiCantidad").textContent =
    data.length;

  document.getElementById("kpiVariacion").textContent =
    variacion.toFixed(2) + "%";

  document.getElementById("kpiPromedio").textContent =
    promedioRentabilidad.toFixed(2) + "%";


  // 🎨 COLOR KPI
  const el = document.getElementById("kpiVariacion");
  if (el) {
    el.style.color = variacion >= 0 
     ? "var(--color-success)" 
     : "var(--color-danger)";
  }


  // 📊 gráfico
  crearGrafico(ventasPorMes);

// 🎨 COLOR RENTABILIDAD GLOBAL
const elRent = document.getElementById("kpiRentabilidad");

if (elRent) {
  elRent.style.color = rentabilidadGlobal >= 30
    ? "var(--color-success)"
    : rentabilidadGlobal >= 15
    ? "orange"
    : "var(--color-danger)";
}

// 🎨 COLOR PROMEDIO
const elProm = document.getElementById("kpiPromedio");

if (elProm) {
  elProm.style.color = promedioRentabilidad >= 30
    ? "var(--color-success)"
    : promedioRentabilidad >= 15
    ? "orange"
    : "var(--color-danger)";
}

}

function crearGrafico(data) {

  const ctx = document.getElementById("graficoVentas");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: "Ventas",
        data: Object.values(data)
      }]
    }
  });
}

