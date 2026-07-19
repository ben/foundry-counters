import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const FOUNDRY_PORT = 30000;

export default defineConfig(({ command }) => ({
  base: "/modules/foundry-counters/",

  build: {
    lib: {
      entry: "src/module.ts",
      name: "FoundryCounters",
      fileName: "module",
      formats: ["es"],
    },
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },

  plugins: [
    viteStaticCopy({
      targets: [
        { src: "module.json", dest: "." },
        { src: "templates", dest: "." },
        { src: "styles", dest: "." },
        { src: "lang", dest: "." },
      ],
    }),
    ...(command === "serve"
      ? [
          {
            name: "foundry-full-reload",
            handleHotUpdate({ file, server }) {
              if (/\.(hbs|json|css|ts|js)$/.test(file)) {
                server.ws.send({ type: "full-reload", path: "*" });
                return [];
              }
            },
          },
        ]
      : []),
  ],

  ...(command === "serve"
    ? {
        server: {
          port: 30001,
          proxy: {
            "^(?!/modules/foundry-counters)": `http://localhost:${FOUNDRY_PORT}/`,
            "/socket.io": {
              target: `ws://localhost:${FOUNDRY_PORT}`,
              ws: true,
            },
          },
        },
      }
    : {}),
}));
