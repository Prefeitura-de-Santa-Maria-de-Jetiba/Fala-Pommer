const CHAVE_ALTO_CONTRASTE = "fala-pommer:alto-contraste";
const CLASSE_ALTO_CONTRASTE = "alto-contraste";

export function obterPreferenciaAltoContraste() {
    return localStorage.getItem(CHAVE_ALTO_CONTRASTE) === "true";
}

export function aplicarAltoContraste(ativo: boolean) {
    document.documentElement.classList.toggle(CLASSE_ALTO_CONTRASTE, ativo);
    localStorage.setItem(CHAVE_ALTO_CONTRASTE, String(ativo));
}

export function inicializarAltoContraste() {
    document.documentElement.classList.toggle(
        CLASSE_ALTO_CONTRASTE,
        obterPreferenciaAltoContraste()
    );
}
