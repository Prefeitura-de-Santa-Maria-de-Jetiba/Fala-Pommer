export type ItemPaginacao = number | `reticencias-${number}`;

export function obterItensPaginacao(
    paginaAtual: number,
    totalPaginas: number,
): ItemPaginacao[] {
    if (totalPaginas <= 7) {
        return Array.from(
            { length: totalPaginas },
            (_, indice) => indice + 1,
        );
    }

    const paginas = Array.from(new Set([
        1,
        2,
        paginaAtual - 1,
        paginaAtual,
        paginaAtual + 1,
        totalPaginas - 1,
        totalPaginas,
    ]))
        .filter((pagina) => pagina >= 1 && pagina <= totalPaginas)
        .sort((paginaA, paginaB) => paginaA - paginaB);

    const itens: ItemPaginacao[] = [];

    paginas.forEach((pagina, indice) => {
        const paginaAnterior = paginas[indice - 1];

        if (paginaAnterior !== undefined && pagina - paginaAnterior > 1) {
            itens.push(`reticencias-${paginaAnterior}`);
        }

        itens.push(pagina);
    });

    return itens;
}
