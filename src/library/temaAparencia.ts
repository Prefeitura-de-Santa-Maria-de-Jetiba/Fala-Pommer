export type TemaAparencia = "claro" | "escuro";

const CHAVE_TEMA_APARENCIA = "tema-aparencia";

export function obterTemaAparencia(): TemaAparencia {
    return localStorage.getItem(CHAVE_TEMA_APARENCIA) === "escuro"
        ? "escuro"
        : "claro";
}

export function aplicarTemaAparencia(tema: TemaAparencia) {
    document.documentElement.classList.toggle("tema-escuro", tema === "escuro");
    localStorage.setItem(CHAVE_TEMA_APARENCIA, tema);
}

export function inicializarTemaAparencia() {
    aplicarTemaAparencia(obterTemaAparencia());
}
