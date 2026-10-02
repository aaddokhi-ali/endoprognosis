import { NextRequest, NextResponse } from "next/server";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// ════════════════════════════════════════════════════════════
// INITIALIZE FIREBASE ADMIN
// ════════════════════════════════════════════════════════════

let db: any;
let bucket: any;

function initializeFirebaseAdmin() {
  if (getApps().length === 0 && process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    } catch (err) {
      console.error("Failed to initialize Firebase Admin:", err);
      throw new Error("Firebase Admin initialization failed. Check FIREBASE_SERVICE_ACCOUNT env var.");
    }
  }
  db = getFirestore();
  bucket = getStorage().bucket();
}

// ════════════════════════════════════════════════════════════
// HANDLER
// ════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    initializeFirebaseAdmin();

    // Parse multipart form data
    const formData = await req.formData();
    const caseId = formData.get("caseId") as string;
    const userId = formData.get("userId") as string;

    if (!caseId || !userId) {
      return NextResponse.json(
        { error: "Missing caseId or userId" },
        { status: 400 }
      );
    }

    // Get all files and their corresponding types
    const files = formData.getAll("files") as File[];
    const types = formData.getAll("types") as string[];
    const names = formData.getAll("names") as string[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // ════════════════════════════════════════════════════════════
    // VALIDATE CASE OWNERSHIP
    // ════════════════════════════════════════════════════════════

    const caseDoc = await db.collection("cases").doc(caseId).get();
    if (!caseDoc.exists) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    const caseData = caseDoc.data();
    if (caseData.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized — this case doesn't belong to you" },
        { status: 403 }
      );
    }

    // ════════════════════════════════════════════════════════════
    // UPLOAD FILES
    // ════════════════════════════════════════════════════════════

    const uploadedRadiographs: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = types[i] || "other";
      const name = names[i] || file.name;

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const ext = name.split(".").pop() || "jpg";
      const storagePath = `radiographs/${userId}/${caseId}/${timestamp}-${randomId}.${ext}`;

      // Convert File to Buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Upload to Firebase Storage
      const fileRef = bucket.file(storagePath);
      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          cacheControl: "public, max-age=31536000",
        },
      });

      // Get public download URL
      const [url] = await fileRef.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });

      // Save metadata to Firestore
      const radiographRef = db
        .collection("cases")
        .doc(caseId)
        .collection("radiographs")
        .doc();

      await radiographRef.set({
        id: radiographRef.id,
        name,
        type,
        url,
        storagePath,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: Timestamp.now(),
        uploadedBy: userId,
      });

      uploadedRadiographs.push({
        id: radiographRef.id,
        name,
        type,
        url,
      });
    }

    // ════════════════════════════════════════════════════════════
    // UPDATE CASE DOCUMENT
    // ════════════════════════════════════════════════════════════

    await db.collection("cases").doc(caseId).update({
      radiographCount: uploadedRadiographs.length,
      radiographsUpdatedAt: Timestamp.now(),
    });

    return NextResponse.json(
      {
        success: true,
        message: `Successfully uploaded ${uploadedRadiographs.length} radiograph(s)`,
        radiographs: uploadedRadiographs,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to upload radiographs" },
      { status: 500 }
    );
  }
}