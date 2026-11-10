import {
    createContext,
    useContext,
    type Dispatch,
    type SetStateAction,
} from "react";

export type NavegacaoAudioContexto = {
    navegacaoAudioAtiva: boolean;
    setNavegacaoAudioAtiva: Dispatch<SetStateAction<boolean>>;
};

export const NavegacaoAudioContext = createContext<NavegacaoAudioContexto | null>(null);

export function useNavegacaoAudio() {
    const contexto = useContext(NavegacaoAudioContext);

    if (!contexto) {
        throw new Error("useNavegacaoAudio deve ser usado dentro de NavegacaoAudioProvider.");
    }

    return contexto;
}
