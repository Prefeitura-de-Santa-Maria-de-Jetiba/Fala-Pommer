const CHAVE_TEXTO_AMPLIADO = "fala-pommer:texto-ampliado";
const CLASSE_TEXTO_AMPLIADO = "texto-ampliado";

export function obterPreferenciaTextoAmpliado() {
    return localStorage.getItem(CHAVE_TEXTO_AMPLIADO) === "true";
}

export function aplicarTextoAmpliado(ativo: boolean) {
    document.documentElement.classList.toggle(CLASSE_TEXTO_AMPLIADO, ativo);
    localStorage.setItem(CHAVE_TEXTO_AMPLIADO, String(ativo));
}

export function inicializarTextoAmpliado() {
    document.documentElement.classList.toggle(
        CLASSE_TEXTO_AMPLIADO,
        obterPreferenciaTextoAmpliado()
    );
}
