// Configura o servidor de desenvolvimento do frontend.
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "http://localhost:3000";

  return {
    plugins: [react()],

    // Permite acessar o frontend pela rede local.
    server: {
      host: "0.0.0.0",
      port: 5173,
      // Evita iniciar o servidor em outra porta automaticamente.
      strictPort: true,
      // Mantém autenticação web e cookie na mesma origem durante o desenvolvimento.
      proxy: {
        "^/(auth|usuarios|conversas|setores|secretaria|comunidades)(?:/|$)": {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
