// src/components/maps/AlumniPopup.tsx
import { Badge } from "@/components/ui/badge";

export default function AlumniPopup({
  alumni,
  onNavigate,
}: {
  alumni: any;
  onNavigate: (url: string) => void;
}) {
  return (
    <div className="p-2">
      <a
        href={`/alumni/${alumni.id}`}
        className="font-semibold text-sm text-blue-600 hover:text-blue-800 cursor-pointer hover:underline block"
        onClick={(e) => {
          e.preventDefault();
          onNavigate(`/alumni/${alumni.id}`);
        }}
      >
        {alumni.firstName} {alumni.lastName}
      </a>
      <p className="text-xs text-gray-600">Class of {alumni.cohortYear}</p>
      <p className="text-xs text-gray-600">{alumni.college}</p>
      <Badge
        variant={alumni.trackingStatus === "on-track" ? "default" : "secondary"}
        className="mt-1 text-xs"
      >
        {String(alumni.trackingStatus || "").replace("-", " ")}
      </Badge>
    </div>
  );
}