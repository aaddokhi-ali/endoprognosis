"use client";
import { useState } from "react";
import { collection, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import ProtectedRoute from "../../components/protectedroute";
import Navigation from "../../components/navigation";
import { CaseCheck, checkCase, summarise, toCsv } from "../../lib/epiBackfill";

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RecomputePage() {
  const { user } = useAuth();
  const [checks, setChecks] = useState<CaseCheck[] | null>(null);
  const [raw, setRaw] = useState<{ id: string; data: unknown }[]>([]);
  const [others, setOthers] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const run = async () => {
    if (!user) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const snap = await getDocs(query(collection(db, "cases"), where("userId", "==", user.uid)));
      const mine = snap.docs.filter(d => d.data().type === "endodecide");
      setOthers(snap.docs.length - mine.length);
      setRaw(mine.map(d => ({ id: d.id, data: d.data() })));
      setChecks(mine.map(d => checkCase(d.id, d.data())));
    } catch (err) {
      console.error(err);
      setError("The cases couldn't be read. Check you are signed in and try again.");
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!checks) return;
    const ready = checks.filter(c => c.status === "ready" && c.fields);
    if (ready.length === 0) return;
    setBusy(true);
    setError("");
    setMessage("");
    let done = 0;
    try {
      for (let i = 0; i < ready.length; i += 400) {
        const batch = writeBatch(db);
        ready.slice(i, i + 400).forEach(c => batch.update(doc(db, "cases", c.id), c.fields as Record<string, unknown>));
        await batch.commit();
        done += Math.min(400, ready.length - i);
      }
      setChecks(prev => (prev ? prev.map(c => (c.status === "ready" ? { ...c, status: "already" as const, fields: null } : c)) : prev));
      setMessage(`Added the new fields to ${done} case${done === 1 ? "" : "s"}. No saved score was changed.`);
    } catch (err) {
      console.error(err);
      setError(`Stopped after ${done} case${done === 1 ? "" : "s"}. The rest were not changed. Run the check again and continue.`);
    } finally {
      setBusy(false);
    }
  };

  const s = checks ? summarise(checks) : null;
  const flagged = (checks || []).filter(c => c.status === "mismatch" || c.status === "missing");

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Add the breakdown to saved cases</h1>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              This adds the score breakdown, the model version, and the advice line to the EndoDecide cases you saved earlier. It works from each case&apos;s own saved inputs.
              <b className="text-white"> It never changes a saved score.</b> A case whose recomputed score differs from the saved one is listed and left alone.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-semibold">Step 1: check, with no changes</p>
            <button onClick={run} disabled={busy || !user} className="bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-black font-bold px-5 py-2.5 rounded-xl text-sm">
              {busy && !checks ? "Checking..." : "Check my cases"}
            </button>
          </div>

          {s && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  ["Cases", s.total, "text-white"],
                  ["Ready", s.ready, "text-[#10b981]"],
                  ["Already done", s.already, "text-gray-300"],
                  ["Do not match", s.mismatch, "text-red-400"],
                  ["Inputs missing", s.missing, "text-amber-400"],
                ].map(([label, n, tone]) => (
                  <div key={String(label)} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-black ${tone}`}>{n}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{label}</p>
                  </div>
                ))}
              </div>
              {others > 0 && <p className="text-xs text-gray-500">{others} other saved item{others === 1 ? "" : "s"} (not EndoDecide cases) {others === 1 ? "was" : "were"} ignored.</p>}

              {flagged.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/30 rounded-2xl p-5 space-y-2">
                  <p className="text-sm font-semibold text-red-300">Cases that were not changed, and why</p>
                  <p className="text-xs text-gray-400">A mismatch usually means the case was saved by an older version of the form. Do not use these in the study until you have looked at them.</p>
                  <div className="space-y-1 max-h-72 overflow-auto">
                    {flagged.map(c => (
                      <p key={c.id} className="text-xs text-gray-300">
                        <span className="font-mono text-gray-500">{c.id.slice(0, 8)}</span> · tooth {c.toothNumber || "?"} · {c.caseName || "no name"}: {c.reasons.join("; ")}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <p className="text-sm font-semibold">Step 2: keep a copy first</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => download(`endodecide-cases-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(raw, null, 2), "application/json")} className="border border-white/20 hover:border-white/40 px-4 py-2 rounded-xl text-sm">
                    Download a backup of my cases
                  </button>
                  <button onClick={() => download(`endodecide-check-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(checks!), "text/csv")} className="border border-white/20 hover:border-white/40 px-4 py-2 rounded-xl text-sm">
                    Download the check file (CSV)
                  </button>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <p className="text-sm font-semibold">Step 3: add the new fields</p>
                <p className="text-xs text-gray-400">Only the {s.ready} ready case{s.ready === 1 ? "" : "s"} are written, and only the new fields.</p>
                <button onClick={apply} disabled={busy || s.ready === 0} className="bg-[#10b981] hover:bg-[#059669] disabled:opacity-40 text-black font-bold px-5 py-2.5 rounded-xl text-sm">
                  {busy ? "Working..." : `Add to ${s.ready} case${s.ready === 1 ? "" : "s"}`}
                </button>
              </div>
            </>
          )}

          {message && <div className="rounded-xl border border-[#10b981]/30 bg-[#10b981]/10 px-4 py-3 text-sm text-[#10b981]">{message}</div>}
          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        </div>
      </div>
    </ProtectedRoute>
  );
}
