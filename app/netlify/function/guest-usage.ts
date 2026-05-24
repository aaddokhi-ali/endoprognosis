import type { Handler, HandlerEvent } from "@netlify/functions";
import * as crypto from "crypto";

// ── CONFIG ──
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID!;
const API_KEY    = process.env.FIREBASE_API_KEY!;
const MAX_USES   = 3;
const RESET_DAYS = 30;

// ── HASH IP (privacy) ──
function hashIP(ip: string): string {
  return crypto.createHash("sha256").update(ip + "endoprognosis_salt").digest("hex").slice(0, 32);
}

// ── FIRESTORE REST HELPERS ──
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function getDoc(path: string): Promise<any | null> {
  const res = await fetch(`${BASE}/${path}?key=${API_KEY}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore GET failed: ${res.status}`);
  return res.json();
}

async function setDoc(path: string, fields: Record<string, any>): Promise<void> {
  const res = await fetch(
    `${BASE}/${path}?key=${API_KEY}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    }
  );
  if (!res.ok) throw new Error(`Firestore PATCH failed: ${res.status}`);
}

// ── FIRESTORE VALUE HELPERS ──
function toFS(val: any): any {
  if (typeof val === "number")  return { integerValue: String(val) };
  if (typeof val === "string")  return { stringValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  throw new Error("Unsupported type");
}

function fromFS(doc: any): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields || {})) {
    const val = v as any;
    if ("integerValue"  in val) out[k] = parseInt(val.integerValue);
    else if ("stringValue"  in val) out[k] = val.stringValue;
    else if ("booleanValue" in val) out[k] = val.booleanValue;
    else if ("timestampValue" in val) out[k] = val.timestampValue;
  }
  return out;
}

// ── HANDLER ──
export const handler: Handler = async (event: HandlerEvent) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    // ── Get real IP ──
    const ip =
      event.headers["x-nf-client-connection-ip"] ||
      event.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      event.headers["client-ip"] ||
      "unknown";

    const hashedIP = hashIP(ip);
    const docPath  = `guestUsage/${hashedIP}`;
    const now      = Date.now();

    // ── Fetch existing doc ──
    const existing = await getDoc(docPath);
    let count     = 0;
    let firstUsed = now;

    if (existing) {
      const data = fromFS(existing);
      count     = data.count     ?? 0;
      firstUsed = data.firstUsed ?? now;

      // ── Check 30-day reset ──
      const daysSinceFirst = (now - firstUsed) / (1000 * 60 * 60 * 24);
      if (daysSinceFirst >= RESET_DAYS) {
        count     = 0;
        firstUsed = now;
      }
    }

    // ── Check limit ──
    if (count >= MAX_USES) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          allowed:  false,
          usesLeft: 0,
          message:  "Guest limit reached. Please create a free account.",
        }),
      };
    }

    // ── Increment ──
    const newCount = count + 1;
    await setDoc(docPath, {
      count:     toFS(newCount),
      firstUsed: toFS(firstUsed),
      lastUsed:  toFS(now),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        allowed:  true,
        usesLeft: MAX_USES - newCount,
        count:    newCount,
      }),
    };
  } catch (err: any) {
    console.error("guest-usage error:", err);
    // Fail open — don't block users if Firestore is down
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ allowed: true, usesLeft: 2, error: err.message }),
    };
  }
};