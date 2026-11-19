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
  /** Original item numbers that share one multi-panel A–D diagram. */
  choiceGroupQuestions?: number[];
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
    const JSZip = (await import("jszip")).default;
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
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
    const documentXml = await zip.file("word/document.xml")?.async("string");
    const mathByBlock = documentXml ? extractDocxMathByBlock(documentXml) : [];
    const extracted = docxHtmlToStructuredText(result.value, mathByBlock);
    return expandFourPanelChoiceGroups(extracted);
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
  const match = text.match(/(?:^|\b)(?:questions?|items?)\s*(\d+)\s*(?:and|to|[-–])\s*\d+\b|(?:^|\b)(?:question|item)\s*(\d+)\b|^\s*(\d+)\s*[.)]/i);
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
function docxHtmlToStructuredText(html: string, mathByBlock: string[] = []): ExtractedFile {
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

  let blockIndex = 0;
  for (const el of Array.from(doc.body.children)) {
    const rawBlockText = mathByBlock[blockIndex++];
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

    const text = (rawBlockText || el.textContent || "").trim();
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

/**
 * Word stores equations as Office Math Markup Language (OMML). Mammoth keeps
 * the surrounding paragraph but omits many OMML runs, which makes choices such
 * as `A. [equation]` look empty to the MCQ parser. This small renderer keeps
 * the mathematical meaning in readable Unicode/ASCII form without requiring
 * a second math engine in the browser.
 */
function extractDocxMathByBlock(xml: string): string[] {
  const parsed = new DOMParser().parseFromString(xml, "application/xml");
  const body = parsed.getElementsByTagNameNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "body")[0]
    ?? parsed.getElementsByTagName("w:body")[0];
  if (!body) return [];
  const blocks: string[] = [];
  for (const block of Array.from(body.children)) {
    if (xmlLocalName(block) === "p") {
      const text = docxVisibleText(block);
      const hasDrawing = block.getElementsByTagName("w:drawing").length > 0 || block.getElementsByTagName("drawing").length > 0;
      if (text.trim() || hasDrawing) blocks.push(text);
    } else if (xmlLocalName(block) === "tbl") {
      // Keep the table slot so the following paragraphs stay aligned with
      // Mammoth's direct TABLE child in the HTML output.
      blocks.push("");
    }
  }
  return blocks;
}

function docxVisibleText(node: Element): string {
  const parts: string[] = [];
  for (const child of Array.from(node.children)) {
    const name = xmlLocalName(child);
    if (name === "t") {
      parts.push(child.textContent ?? "");
    } else if (name === "oMath" || name === "oMathPara") {
      parts.push(ommlToText(child));
    } else if (name !== "pPr" && name !== "rPr") {
      parts.push(docxVisibleText(child));
    }
  }
  return parts.join("");
}

function childByLocalName(node: Element, localName: string): Element | undefined {
  return Array.from(node.children).find((child) => xmlLocalName(child) === localName);
}

function ommlToText(node: Element): string {
  const name = xmlLocalName(node);
  if (name === "t") return node.textContent ?? "";

  if (name === "f") {
    const numerator = childByLocalName(node, "num");
    const denominator = childByLocalName(node, "den");
    return `(${ommlChildrenToText(numerator)})/(${ommlChildrenToText(denominator)})`;
  }
  if (name === "sSup") {
    return `${ommlChildrenToText(childByLocalName(node, "e"))}^(${ommlChildrenToText(childByLocalName(node, "sup"))})`;
  }
  if (name === "sSub") {
    return `${ommlChildrenToText(childByLocalName(node, "e"))}_(${ommlChildrenToText(childByLocalName(node, "sub"))})`;
  }
  if (name === "sSubSup") {
    return `${ommlChildrenToText(childByLocalName(node, "e"))}_(${ommlChildrenToText(childByLocalName(node, "sub"))})^(${ommlChildrenToText(childByLocalName(node, "sup"))})`;
  }
  if (name === "rad") {
    const base = ommlChildrenToText(childByLocalName(node, "e"));
    const degree = ommlChildrenToText(childByLocalName(node, "deg"));
    return degree ? `root(${degree},${base})` : `sqrt(${base})`;
  }
  if (name === "d") {
    return `(${ommlChildrenToText(childByLocalName(node, "e"))})`;
  }
  if (name === "nary") {
    const operator = childByLocalName(node, "naryPr")?.getAttribute("val") ?? "∑";
    return `${operator}${ommlChildrenToText(childByLocalName(node, "e"))}`;
  }
  if (name === "r") return ommlChildrenToText(node);
  return ommlChildrenToText(node);
}

function ommlChildrenToText(node?: Element): string {
  if (!node) return "";
  return Array.from(node.children).map((child) => ommlToText(child)).join("");
}

function xmlLocalName(node: Element): string {
  return (node.localName || node.tagName).split(":").pop() ?? "";
}

async function expandFourPanelChoiceGroups(extracted: ExtractedFile): Promise<ExtractedFile> {
  if (typeof Image === "undefined" || typeof document === "undefined") return extracted;
  const images: ExtractedImage[] = [];
  for (const image of extracted.images) {
    const size = await getImageSize(image.dataUrl);
    const isFourPanel = image.questionNumber !== undefined
      && size.width >= 1100
      && size.height >= 1100
      && size.width / size.height > 0.85
      && size.width / size.height < 1.15;

    if (!isFourPanel) {
      images.push(image);
      continue;
    }

    const midX = Math.floor(size.width / 2);
    const midY = Math.floor(size.height / 2);
    const crops = [
      [0, 0, midX, midY],
      [midX, 0, size.width - midX, midY],
      [0, midY, midX, size.height - midY],
      [midX, midY, size.width - midX, size.height - midY],
    ] as const;
    const groupQuestions = [0, 1, 2, 3].map((offset) => image.questionNumber! + offset);
    for (let choiceIndex = 0; choiceIndex < crops.length; choiceIndex++) {
      const [x, y, width, height] = crops[choiceIndex];
      images.push({
        ...image,
        dataUrl: await cropImageDataUrl(image.dataUrl, x, y, width, height),
        choiceIndex,
        choiceGroupQuestions: groupQuestions,
        alt: `Graph choice ${String.fromCharCode(65 + choiceIndex)}`,
      });
    }
  }
  return { ...extracted, images };
}

function getImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = dataUrl;
  });
}

function cropImageDataUrl(dataUrl: string, x: number, y: number, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas is unavailable while preparing a graph choice."));
        return;
      }
      context.drawImage(image, x, y, width, height, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Could not crop the graph-choice image."));
    image.src = dataUrl;
  });
}
