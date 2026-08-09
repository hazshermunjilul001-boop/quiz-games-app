const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destDir = path.join(__dirname, "..", "public");
const dest = path.join(destDir, "pdf.worker.min.mjs");

try {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log("[postinstall] Copied pdfjs worker to public/pdf.worker.min.mjs");
} catch (e) {
  console.warn("[postinstall] Could not copy pdfjs worker:", e.message);
}
