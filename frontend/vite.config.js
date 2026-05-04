import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget =
    env.VITE_BACKEND_URL ||
    (mode === "development"
      ? "http://localhost:8080"
      : "https://app.samachat.com.br");

  return {
    plugins: [
      react({
        jsxRuntime: "classic",
      }),
    ],
    server: {
      port: 3000,
      open: true,
      proxy: {
        "/proxy": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          rewrite: path => path.replace(/^\/proxy/, ""),
        },
        "/socket.io": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            "material-ui": [
              "@material-ui/core",
              "@material-ui/icons",
              "@material-ui/lab",
            ],
          },
        },
      },
    },
    envPrefix: "VITE_",
    esbuild: {
      loader: "jsx",
      include: /src\/.*\.[jt]sx?$/,
      exclude: [],
    },
    define: {
      global: "globalThis",
    },
    optimizeDeps: {
      include: [
        "mic-recorder-to-mp3",
        "@material-ui/core",
        "@material-ui/icons",
        "@material-ui/lab",
      ],
      exclude: [],
    },
    resolve: {
      alias: {
        "jss-plugin-globalThis": "jss-plugin-global",
      },
    },
  };
});
