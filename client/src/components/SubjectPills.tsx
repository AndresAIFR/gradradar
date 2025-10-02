import React from 'react';

interface SubjectPillsProps {
  subjects: string[];
  activeSubject: string;
  onSubjectChange: (subject: string) => void;
}

export function SubjectPills({ subjects, activeSubject, onSubjectChange }: SubjectPillsProps) {
  if (subjects.length === 0) {
    return null;
  }

  // Always show pills for visual confirmation of active subject

  return (
    <div className="inline-flex bg-slate-100 rounded-lg p-1 mb-4">
      {subjects.map((subject) => (
        <button
          key={subject}
          onClick={() => onSubjectChange(subject)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            activeSubject === subject
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          {subject}
        </button>
      ))}
    </div>
  );
}