import { GraduationCap } from "lucide-react";
import EmailAuthForms from "@/components/EmailAuthForms";

export default function Landing() {
  const handleLoginSuccess = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">GradRadar</h1>
          </div>
        </div>

        {/* Authentication Forms */}
        <div>
          <EmailAuthForms onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    </div>
  );
}