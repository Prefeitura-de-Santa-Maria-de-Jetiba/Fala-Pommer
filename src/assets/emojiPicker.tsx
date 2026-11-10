// Exibe o seletor de emojis usado nas mensagens.
import { useEffect, useRef } from "react";
import { Picker } from "emoji-picker-element";
import ptBR from "emoji-picker-element/i18n/pt_BR";

interface EmojiPickerProps {
    aoSelecionar: (emoji: string) => void;
}

function EmojiPicker({
    aoSelecionar
}: EmojiPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const callbackRef = useRef(aoSelecionar);

    useEffect(() => {
        callbackRef.current = aoSelecionar;
    }, [aoSelecionar]);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const picker = new Picker({
            locale: "pt",
            i18n: ptBR,
            dataSource:
                "https://cdn.jsdelivr.net/npm/emoji-picker-element-data@1.8.0/pt/cldr/data.json"
        });

        const estiloRolagem = document.createElement("style");

        estiloRolagem.textContent = `
        .tabpanel,
        .favorites {
            scrollbar-width: thin;
            scrollbar-color: #98a2b3 #f2f4f7;
        }

        .tabpanel::-webkit-scrollbar,
        .favorites::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        .tabpanel::-webkit-scrollbar-track,
        .favorites::-webkit-scrollbar-track {
            background: #f2f4f7;
            border-radius: 10px;
        }

        .tabpanel::-webkit-scrollbar-thumb,
        .favorites::-webkit-scrollbar-thumb {
            background: #98a2b3;
            border-radius: 10px;
        }

        .tabpanel::-webkit-scrollbar-thumb:hover,
        .favorites::-webkit-scrollbar-thumb:hover {
            background: #667085;
        }
        `;

        picker.shadowRoot?.appendChild(estiloRolagem);

        function selecionar(evento: Event) {
            const eventoEmoji = evento as CustomEvent<{
                unicode: string;
            }>;

            callbackRef.current(
                eventoEmoji.detail.unicode
            );
        }

        picker.addEventListener(
            "emoji-click",
            selecionar
        );

        container.appendChild(picker);

        return () => {
            picker.removeEventListener(
                "emoji-click",
                selecionar
            );

            picker.remove();
        };
    }, []);

    return <div ref={containerRef} />;
}

export default EmojiPicker;
