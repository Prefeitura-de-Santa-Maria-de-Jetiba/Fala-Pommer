const CHAVE_PALETA_ACESSIVEL = "fala-pommer:paleta-acessivel";
const CLASSE_PALETA_ACESSIVEL = "paleta-acessivel";

export function obterPreferenciaPaletaAcessivel() {
    return localStorage.getItem(CHAVE_PALETA_ACESSIVEL) === "true";
}

export function aplicarPaletaAcessivel(ativa: boolean) {
    document.documentElement.classList.toggle(CLASSE_PALETA_ACESSIVEL, ativa);
    localStorage.setItem(CHAVE_PALETA_ACESSIVEL, String(ativa));
}

export function inicializarPaletaAcessivel() {
    document.documentElement.classList.toggle(
        CLASSE_PALETA_ACESSIVEL,
        obterPreferenciaPaletaAcessivel(),
    );
}
