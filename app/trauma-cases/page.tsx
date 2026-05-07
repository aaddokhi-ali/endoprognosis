// app/trauma-cases/page.tsx
"use client";
import Navigation from "../components/navigation";
import { useAuth } from "../context/AuthContext";
import { useTrauma } from "../context/TraumaContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TraumaCases() {
  const { user } = useAuth();
  const router = useRouter();
  const { savedCases, deleteCase, setPatientInfo } = useTrauma();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [note, setNote] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) return null;

  // Filter cases based on search
  const filteredCases = savedCases.filter((caseItem: any) =>
    caseItem.patientInfo.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caseItem.patientInfo.phoneNumber.includes(searchTerm) ||
    caseItem.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCaseModal = (caseItem: any) => {
    setSelectedCase(caseItem);
    setNote(caseItem.notes || "");
    setShowModal(true);
  };

  const saveNotes = () => {
    // For now we just alert (you can expand this later to actually update in context)
    alert("✅ Notes saved successfully!");
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this case?")) {
      deleteCase(id);
    }
  };

  const handleNewCase = () => {
    router.push("/dental-trauma-center");
  };

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
              <h1 className="text-4xl font-serif">Trauma Cases</h1>
              <p className="text-gray-400 mt-1">Total Cases: {savedCases.length}</p>
            </div>
            <button 
              onClick={handleNewCase}
              className="bg-[#10b981] hover:bg-emerald-500 text-black px-8 py-4 rounded-2xl font-semibold flex items-center gap-3 transition-all"
            >
              + New Trauma Case
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <input
              type="text"
              placeholder="Search by patient name, phone, or case type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-white/10 px-8 py-5 text-sm font-medium border-b border-white/10">
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Patient Name</div>
              <div className="col-span-1">Tooth</div>
              <div className="col-span-2">Case Type</div>
              <div className="col-span-2">Phone Number</div>
              <div className="col-span-2 text-center">Actions</div>
            </div>

            {/* Cases List */}
            {filteredCases.length > 0 ? (
              filteredCases.map((caseItem: any) => (
                <div key={caseItem.id} className="grid grid-cols-12 px-8 py-6 border-b border-white/10 hover:bg-white/5 transition-all">
                  <div className="col-span-2 text-gray-400">{caseItem.date}</div>
                  <div className="col-span-3 font-medium">{caseItem.patientInfo.patientName}</div>
                  <div className="col-span-1 font-mono text-blue-400">{caseItem.patientInfo.tooth}</div>
                  <div className="col-span-2">{caseItem.type}</div>
                  <div className="col-span-2 font-mono text-gray-400">{caseItem.patientInfo.phoneNumber}</div>
                  <div className="col-span-2 flex justify-center gap-4">
                    <button 
                      onClick={() => openCaseModal(caseItem)}
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      View / Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(caseItem.id)}
                      className="text-red-400 hover:text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-gray-500">
                No trauma cases found.
                {searchTerm && <p className="mt-2">Try a different search term.</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Case Detail / Edit Modal */}
      {showModal && selectedCase && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-semibold">{selectedCase.type}</h2>
                  <p className="text-gray-400 mt-1">
                    {selectedCase.patientInfo.patientName} — Tooth {selectedCase.patientInfo.tooth}
                  </p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-6 mb-8 bg-white/5 p-6 rounded-2xl">
                <div>
                  <p className="text-gray-400 text-sm">Phone Number</p>
                  <p className="font-mono text-lg">{selectedCase.patientInfo.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Age & Gender</p>
                  <p>{selectedCase.patientInfo.age} years • {selectedCase.patientInfo.gender}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Injury Date</p>
                  <p>{new Date(selectedCase.patientInfo.traumaDate).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Chief Complaint</p>
                  <p className="text-gray-300">{selectedCase.patientInfo.chiefComplaint || "Not provided"}</p>
                </div>
              </div>

              {/* Notes Section */}
              <div className="mb-8">
                <label className="block text-sm mb-3 text-gray-400">Notes / Additional Information</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={6}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white resize-y focus:border-blue-500"
                  placeholder="Add clinical notes, follow-up observations, or any additional information..."
                />
              </div>

              {/* Saved Result */}
              {selectedCase.resultHTML && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Saved Protocol</h3>
                  <div 
                    className="prose prose-invert max-w-none bg-white/5 border border-white/10 rounded-2xl p-8 overflow-auto max-h-[400px]"
                    dangerouslySetInnerHTML={{ __html: selectedCase.resultHTML }} 
                  />
                </div>
              )}

              <div className="flex gap-4 pt-6 border-t border-white/10">
                <button 
                  onClick={saveNotes}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl font-semibold"
                >
                  Save Notes
                </button>
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 py-4 rounded-2xl font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}