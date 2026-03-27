export function formatearMonedaInput(input) {

  // 🔹 SOLO permite números mientras escribe
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "");
  });

  // 🔹 FORMATEA cuando sale del campo
  input.addEventListener("blur", () => {
    if (!input.value) return;

    const numero = Number(input.value);
    input.value = numero.toLocaleString("es-CO");
  });

  // 🔹 OPCIONAL: quitar formato al entrar (para editar fácil)
  input.addEventListener("focus", () => {
    input.value = input.value.replace(/\./g, "");
  });



}

export function limpiarMoneda(valor) {
  return Number(valor.replace(/\./g, ""));
}