export type PlanoFundoConversa = 1 | 2 | 3 | 4 | 5;

const CHAVE_PLANO_FUNDO = "fala-pommer:plano-fundo-conversa";
const CLASSES_PLANO_FUNDO = [
    "plano-fundo-conversa-1",
    "plano-fundo-conversa-2",
    "plano-fundo-conversa-3",
    "plano-fundo-conversa-4",
    "plano-fundo-conversa-5",
];

export function obterPlanoFundoConversa(): PlanoFundoConversa {
    const planoSalvo = Number(localStorage.getItem(CHAVE_PLANO_FUNDO));

    return planoSalvo >= 1 && planoSalvo <= 5
        ? planoSalvo as PlanoFundoConversa
        : 1;
}

export function aplicarPlanoFundoConversa(plano: PlanoFundoConversa) {
    document.documentElement.classList.remove(...CLASSES_PLANO_FUNDO);
    document.documentElement.classList.add(`plano-fundo-conversa-${plano}`);
    localStorage.setItem(CHAVE_PLANO_FUNDO, String(plano));
}

export function inicializarPlanoFundoConversa() {
    aplicarPlanoFundoConversa(obterPlanoFundoConversa());
}
