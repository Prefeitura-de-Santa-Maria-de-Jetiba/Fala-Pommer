export function obterUrlImagemComunidade(url: string | null) {
    if (!url) return undefined;

    return url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `${import.meta.env.VITE_API_URL}${url}`;
}