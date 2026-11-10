function categoriaQueMaisGostaComunidade(categorias: string[], limite: number): string[] {
	const frequencias = new Map<string, number>();

	for (const categoria of categorias) {
		frequencias.set(categoria, (frequencias.get(categoria) ?? 0) + 1);
	}

	return [...frequencias.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, limite)
		.map(([categoria]) => categoria);
}

export default categoriaQueMaisGostaComunidade;