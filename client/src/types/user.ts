export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  fromEmail: string | null;
  role: "staff" | "admin" | "alumni";
  authMethod: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}