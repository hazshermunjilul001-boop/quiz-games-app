import mammoth from "mammoth";
import fs from "fs";
import { importFromText } from "./lib/importPipeline";

const buffer = fs.readFileSync(process.argv[2]);
const result = await mammoth.extractRawText({ buffer });
try {
  const { bank, warnings } = importFromText(result.value, "Test");
  console.log("Parsed questions:", bank.questions.length);
  console.log("Warnings:", warnings.length);
  console.log("First 3 warnings:", warnings.slice(0,3));
  console.log("First question:", JSON.stringify(bank.questions[0], null, 1));
} catch (e: any) {
  console.log("THREW ERROR:", e.message);
}
