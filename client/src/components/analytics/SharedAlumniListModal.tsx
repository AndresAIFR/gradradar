// src/components/analytics/SharedAlumniListModal.tsx
import React from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  alumni: any[];
  onNavigateToAlumni: (url: string) => void;
};

export default function SharedAlumniListModal({ isOpen, onClose, alumni, onNavigateToAlumni }: Props) {
  if (!isOpen) return null;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };
  
  const getAvatarColor = (index: number) => {
    const colors = [
      'from-emerald-400 to-teal-400',
      'from-sky-400 to-blue-400', 
      'from-violet-400 to-purple-400',
      'from-amber-400 to-orange-400',
      'from-rose-400 to-pink-400'
    ];
    return colors[index % colors.length];
  };

  const handleViewInAlumniPage = () => {
    if (!alumni.length) return;
    const ids = alumni.map(a => a.id);
    const colleges = alumni.map(a => a.college).filter(Boolean);
    const bases = colleges.map((c: string) => c.match(/^([^(]+)/)?.[1]?.trim() ?? c);
    const set = new Set(bases);
    const sharedCollege = set.size === 1 ? [...set][0] : null;

    const params = new URLSearchParams();
    params.set("ids", ids.join(","));
    if (sharedCollege) params.set("collegeAttending", sharedCollege);

    onNavigateToAlumni(`/alumni?${params.toString()}`);
  };

  const statusDot = (status: string) =>
    status === "on-track" ? "bg-green-500" : status === "near-track" ? "bg-yellow-500" : status === "off-track" ? "bg-red-500" : "bg-gray-400";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-3 max-w-sm w-full max-h-[80vh] overflow-hidden shadow-2xl m-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold">Alumni ({alumni.length})</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="mb-3">
          <button onClick={handleViewInAlumniPage} className="w-full px-3 py-2 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors">
            View in Alumni Page
          </button>
        </div>

        <div className="overflow-y-auto max-h-[65vh] space-y-1">
          {alumni
            .slice()
            .sort((a, b) => String(a.lastName).localeCompare(String(b.lastName)))
            .map((a, index) => (
              <div key={a.id} className="py-1 px-2 hover:bg-gray-50 rounded text-xs">
                <button onClick={() => onNavigateToAlumni(`/alumni/${a.id}`)} className="text-left w-full flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${statusDot(a.trackingStatus)}`} />
                  <div>
                    <span className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                      {a.firstName} {a.lastName}
                    </span>
                    <span className="text-gray-600 ml-2">
                      {a.cohortYear}
                      {(a.college || a.collegeAttending || a.trainingProgramName) && ` • ${a.college || a.collegeAttending || a.trainingProgramName}`}
                      {a.collegeMajor && ` • ${a.collegeMajor}`}
                      {a.employerName && ` • ${a.employerName}`}
                    </span>
                  </div>
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}