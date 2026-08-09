// lib/fileParse.ts
// Extracts plain text from an uploaded file, entirely in the browser
// (no file ever touches a server). Same pattern as TOS AI Generator's
// lib/fileParse.ts, so teachers get consistent behavior across both apps.

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".json")) {
    return await file.text();
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    // NOTE: we deliberately use convertToHtml (not extractRawText) here.
    // extractRawText flattens tables into one cell per line with no
    // delimiter, which silently breaks table-based answer keys (the format
    // DepEd test templates commonly use: "Item # | Answer | Item # | Answer").
    // convertToHtml preserves <table> structure so we can serialize each
    // row back into the "N. Letter" line format importPipeline already
    // expects for the answer key section.
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return docxHtmlToStructuredText(result.value);
  }

  if (name.endsWith(".pdf")) {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it: any) => it.str).join(" ");
      fullText += pageText + "\n";
    }
    return fullText;
  }

  throw new Error(
    "Unsupported file type. Please upload a .txt, .docx, .pdf, or .json file."
  );
}

/**
 * Converts mammoth's HTML output into the same one-line-per-paragraph plain
 * text extractRawText would produce, EXCEPT tables are walked structurally:
 * each row's cells are paired up (Item#, Answer, Item#, Answer, ...) and
 * re-emitted as "N. Letter" lines — the exact shape parsePrintedMcqText's
 * answer-key parser already looks for. This keeps importPipeline.ts working
 * on a single plain-text string (its one entry point) while fixing table
 * based answer keys instead of losing them.
 */
function docxHtmlToStructuredText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const lines: string[] = [];

  for (const el of Array.from(doc.body.children)) {
    if (el.tagName === "TABLE") {
      for (const row of Array.from(el.querySelectorAll("tr"))) {
        const cells = Array.from(row.querySelectorAll("td,th")).map((c) =>
          (c.textContent ?? "").trim()
        );
        for (let i = 0; i < cells.length - 1; i += 2) {
          const num = cells[i];
          const ans = cells[i + 1];
          if (/^\d+$/.test(num) && ans) lines.push(`${num}. ${ans}`);
        }
      }
    } else {
      const text = (el.textContent ?? "").trim();
      if (text) lines.push(text);
    }
  }

  return lines.join("\n");
}
