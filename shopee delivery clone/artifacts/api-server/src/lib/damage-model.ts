/**
 * Package damage analysis — plug in RipEye inference here.
 *
 * Set DAMAGE_MODEL_ENABLED=true and DAMAGE_MODEL_URL in `.env` (see `.env.example`).
 * Labels match training: none | minor | severe
 */

export type DamageFlag = "none" | "minor" | "severe";

export type DamageAnalysisResult = {
  damageFlag: DamageFlag;
  /** Human-readable summary for the driver UI */
  damageDetails: string | null;
  message: string;
};

const STUB_RESULT: DamageAnalysisResult = {
  damageFlag: "none",
  damageDetails: null,
  message: "Photo saved. Damage review is not enabled yet.",
};

function normalizeFlag(raw: string | undefined): DamageFlag {
  if (raw === "minor" || raw === "severe") return raw;
  // Legacy inference responses
  if (raw === "suspected") return "minor";
  if (raw === "confirmed") return "severe";
  return "none";
}

function defaultMessage(flag: DamageFlag, details: string | null): string {
  if (flag === "none") return "No visible damage detected.";
  if (flag === "minor") return `Minor damage${details ? `: ${details}` : " — review photo"}`;
  return `Severe damage${details ? `: ${details}` : " — review photo"}`;
}

/**
 * Analyze a package photo (base64 data URL or raw base64).
 *
 * Expected JSON from DAMAGE_MODEL_URL:
 * ```json
 * { "damageFlag": "none"|"minor"|"severe", "damageDetails": "...", "message": "..." }
 * ```
 */
export async function analyzePackagePhoto(imageData: string): Promise<DamageAnalysisResult> {
  const enabled = process.env.DAMAGE_MODEL_ENABLED === "true";
  const modelUrl = process.env.DAMAGE_MODEL_URL?.trim();
  const apiKey = process.env.DAMAGE_MODEL_API_KEY?.trim();

  if (!enabled || !modelUrl) {
    return STUB_RESULT;
  }

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (apiKey) {
      headers.authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(modelUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        image: imageData.replace(/^data:image\/\w+;base64,/, ""),
        mimeType: "image/jpeg",
      }),
      signal: AbortSignal.timeout(
        Number(process.env.DAMAGE_MODEL_TIMEOUT_MS ?? "30000"),
      ),
    });

    if (!response.ok) {
      console.warn(`Damage model returned ${response.status}`);
      return {
        ...STUB_RESULT,
        message: "Photo saved. Damage check unavailable — try again later.",
      };
    }

    const data = (await response.json()) as {
      damageFlag?: string;
      damageDetails?: string | null;
      message?: string;
    };

    const damageFlag = normalizeFlag(data.damageFlag);
    const damageDetails = data.damageDetails ?? null;

    return {
      damageFlag,
      damageDetails,
      message: data.message ?? defaultMessage(damageFlag, damageDetails),
    };
  } catch (error) {
    console.warn("Damage model request failed:", error);
    return {
      ...STUB_RESULT,
      message: "Photo saved. Damage check failed — model unreachable.",
    };
  }
}
