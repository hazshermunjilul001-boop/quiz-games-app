// lib/fileParse.ts
// Extracts text and embedded images from uploaded files entirely in the browser.
// DOCX images are returned as data URLs so they can travel with a QuestionBank.

export type ExtractedImage = {
  dataUrl: string;
  alt?: string;
  nameHint?: string;
  questionNumber?: number;
  /** Zero-based answer-choice index when the image follows A., B., C., etc. */
  choiceIndex?: number;
};

export type ExtractedFile = {
  text: string;
  images: ExtractedImage[];
};

export async function extractFromFile(file: File): Promise<ExtractedFile> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".json")) {
    return { text: await file.text(), images: [] };
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        convertImage: mammoth.images.imgElement(async (image: any) => {
          const base64 = await image.read("base64");
          const contentType = image.contentType || "image/png";
          return { src: `data:${contentType};base64,${base64}` };
        }),
      }
    );
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
    return { text: fullText, images: [] };
  }

  throw new Error("Unsupported file type. Please upload a .txt, .docx, .pdf, or .json file.");
}

/** Compatibility wrapper for callers that only need text. */
export async function extractTextFromFile(file: File): Promise<string> {
  const { text } = await extractFromFile(file);
  return text;
}

function questionNumberIn(text: string): number | undefined {
  const match = text.match(/(?:^|\b)(?:questions?|items?)\s*(\d+)\s*(?:and|[-–])\s*\d+\b|(?:^|\b)(?:question|item)\s*(\d+)\b|^\s*(\d+)\s*[.)]/i);
  const number = match?.[1] ?? match?.[2] ?? match?.[3];
  return number ? Number(number) : undefined;
}

function choiceIndexIn(text: string): number | undefined {
  const match = text.match(/^\s*([A-F])[.)](?:\s|$)/i);
  return match ? "ABCDEF".indexOf(match[1].toUpperCase()) : undefined;
}

/**
 * Converts Mammoth HTML into the same one-line-per-paragraph text used by the
 * existing parser, while collecting images in document order. Images inherit
 * the latest question number seen before them; an image in the same paragraph
 * as a numbered question is linked to that question immediately.
 */
function docxHtmlToStructuredText(html: string): ExtractedFile {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const lines: string[] = [];
  const images: ExtractedImage[] = [];
  let latestQuestionNumber: number | undefined;
  let latestChoiceIndex: number | undefined;

  const collectImages = (root: Element, questionHint?: number, choiceHint?: number) => {
    for (const img of Array.from(root.querySelectorAll("img"))) {
      const dataUrl = img.getAttribute("src");
      if (!dataUrl?.startsWith("data:")) continue;
      const alt = img.getAttribute("alt") || undefined;
      images.push({
        dataUrl,
        alt,
        nameHint: alt,
        questionNumber: questionHint ?? latestQuestionNumber,
        choiceIndex: choiceHint ?? latestChoiceIndex,
      });
    }
  };

  for (const el of Array.from(doc.body.children)) {
    if (el.tagName === "TABLE") {
      for (const row of Array.from(el.querySelectorAll("tr"))) {
        const cells = Array.from(row.querySelectorAll("td,th"));
        const choiceCells = cells
          .map((cell) => ({ cell, choiceIndex: choiceIndexIn((cell.textContent ?? "").trim()) }))
          .filter((entry) => entry.choiceIndex !== undefined && entry.cell.querySelector("img"));

        // Diagram choices in Word are commonly arranged as:
        // A. [image] | B. [image] | C. [image] | D. [image]. Preserve a
        // parseable A-D line and attach the image to that exact choice.
        if (choiceCells.length > 0) {
          for (const { cell, choiceIndex } of choiceCells) {
            const cellText = (cell.textContent ?? "").trim();
            const label = String.fromCharCode(65 + (choiceIndex as number));
            lines.push(cellText.length > 2 ? cellText : `${label}. [Diagram]`);
            collectImages(cell, latestQuestionNumber, choiceIndex);
          }
          continue;
        }

        const cellText = cells.map((cell) => (cell.textContent ?? "").trim()).filter(Boolean);
        if (cellText.length > 0) lines.push(`__TABLE_ROW__${cellText.join(" | ")}`);
        cells.forEach((cell) => collectImages(cell, latestQuestionNumber));
      }
      continue;
    }

    const text = (el.textContent ?? "").trim();
    const localQuestionNumber = questionNumberIn(text);
    if (localQuestionNumber !== undefined) {
      latestQuestionNumber = localQuestionNumber;
      latestChoiceIndex = undefined;
    }
    const localChoiceIndex = choiceIndexIn(text);
    if (localChoiceIndex !== undefined) latestChoiceIndex = localChoiceIndex;
    collectImages(el, localQuestionNumber, localChoiceIndex);

    if (text) lines.push(text);
  }

  return { text: lines.join("\n"), images };
}
