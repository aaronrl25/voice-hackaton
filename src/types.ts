export type Risk = "low" | "medium" | "high";
export type GateStatus =
  | "assisted"
  | "awaiting_user"
  | "awaiting_trusted"
  | "approved"
  | "blocked"
  | "completed";
export type RequestItem = {
  id: string;
  title: string;
  detail: string;
  source: string;
  createdAt: number;
  risk: Risk;
  score: number;
  reasons: string[];
  status: GateStatus;
  userApproved?: boolean;
  trustedApproved?: boolean;
  receipt?: string;
};
export type Contact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  initials: string;
  available: boolean;
};
