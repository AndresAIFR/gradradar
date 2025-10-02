import { Card } from "@/components/ui/card";
import logoImage from "@assets/comp-sci-high-logo.png";

export function GradRadarBrandCard() {
  return (
    <Card className="overflow-hidden">
      <div 
        className="text-white shadow-lg transition-all duration-400 hover:bg-[position:20px_center]"
        style={{
          background: 'linear-gradient(90deg, var(--csh-green-900) 0%, var(--csh-green-700) 60%, var(--csh-green-500) 100%)',
          height: '96px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          padding: '0 32px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}
      >
        <div className="flex items-center space-x-6">
          <img 
            src={logoImage} 
            alt="Comp Sci High Logo" 
            className="w-16 h-16 rounded-lg object-cover"
            style={{ objectPosition: 'center' }}
          />
          <div>
            <h1 className="text-3xl font-bold">GradRadar</h1>
          </div>
        </div>
      </div>
    </Card>
  );
}