import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
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
  ],
});
