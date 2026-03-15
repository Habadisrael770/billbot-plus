import { openrouter } from "@workspace/integrations-openrouter-ai";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

const VISION_MODEL = "google/gemini-flash-1.5";

const SYSTEM_PROMPT = `You are an invoice OCR specialist. Extract data from the invoice image.
Return ONLY a valid JSON object (no markdown, no code blocks) with:
{
  "vendor": "string or null",
  "tax_id": "Israeli tax id / ח.פ / ע.מ / ת.ז or null",
  "invoice_number": "string or null",
  "date": "YYYY-MM-DD or null",
  "subtotal": number_or_null,
  "vat": number_or_null,
  "total": number_or_null,
  "currency": "ILS",
  "document_type": "supplier_invoice|receipt|credit_note|other",
  "confidence": 0.0_to_1.0
}`;

export interface AiExtractResult {
  vendor?: string | null;
  tax_id?: string | null;
  invoice_number?: string | null;
  date?: string | null;
  subtotal?: number | null;
  vat?: number | null;
  total?: number | null;
  currency?: string | null;
  document_type?: string | null;
  confidence: number;
}

export async function extractInvoiceFromFile(filePath: string): Promise<AiExtractResult> {
  const ext = path.extname(filePath).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return extractFromImage(filePath);
  }

  if (ext === ".pdf") {
    return extractFromPdfFallback(filePath);
  }

  return { confidence: 0 };
}

async function extractFromImage(filePath: string): Promise<AiExtractResult> {
  try {
    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString("base64");
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : "image/jpeg";

    const response = await openrouter.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${base64}` },
            },
            {
              type: "text",
              text: "Extract all invoice/receipt data from this image. Return only the JSON.",
            },
          ],
        },
      ],
      max_tokens: 600,
      temperature: 0.1,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned) as AiExtractResult;
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;

    console.log(`[AI Extract] vendor=${parsed.vendor} total=${parsed.total} confidence=${confidence}`);
    return { ...parsed, confidence };
  } catch (err) {
    console.error("[AI Extract] failed:", err);
    return { confidence: 0 };
  }
}

async function extractFromPdfFallback(filePath: string): Promise<AiExtractResult> {
  try {
    // Extract text content from PDF
    const buffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(buffer);
    const text = parsed.text?.trim();

    if (!text || text.length < 20) {
      // Scanned PDF with no selectable text — cannot process
      console.warn("[AI Extract] PDF has no extractable text:", path.basename(filePath));
      return { confidence: 0, currency: "ILS", document_type: "supplier_invoice" };
    }

    // Truncate to avoid token limits (keep first 3000 chars — enough for any invoice)
    const truncated = text.slice(0, 3000);

    const response = await openrouter.chat.completions.create({
      model: "deepseek/deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract invoice data from the following PDF text:\n\n${truncated}\n\nReturn only the JSON.`,
        },
      ],
      max_tokens: 600,
      temperature: 0.1,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const result = JSON.parse(cleaned) as AiExtractResult;
    const confidence = typeof result.confidence === "number" ? result.confidence : 0.5;
    console.log(`[AI Extract PDF] vendor=${result.vendor} total=${result.total} confidence=${confidence}`);
    return { ...result, confidence };
  } catch (err) {
    console.error("[AI Extract PDF] failed:", err);
    return { confidence: 0, currency: "ILS", document_type: "supplier_invoice" };
  }
}
