window.generarPDF = function (consecutivo, clienteSelect, cot = null) {

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const cliente = clienteSelect.selectedOptions[0].dataset.contacto || "—";
  const empresa = clienteSelect.selectedOptions[0].dataset.empresa || "—";

  const evento = document.getElementById("evento")?.value || cot?.evento || "-";
  const ciudad = document.getElementById("ciudad")?.value ||cot?.ciudad || "-";
  const fechaSolicitud = document.getElementById("fechaSolicitud")?.value || cot?.fechaSolicitud || "-";
  const fechaInicial = document.getElementById("fechaInicial")?.value || cot?.fechaInicial || "-";
  const fechaFinal = document.getElementById("fechaFinal")?.value || cot?.fechaFinal || "-";
  const formaPago = document.getElementById("formaPago")?.value || cot?.formaPago || "-";

  const fecha = new Date().toLocaleDateString();

  let y = 20;}