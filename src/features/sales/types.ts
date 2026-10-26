export type Customer = {
  id: string; display_name: string; contact_name: string; phone: string;
  email: string; address: string; cuit: string; notes: string; version: number;
};
export type QuoteItem = { client_description?: string; technical_sheet?: import("@/features/production/technical-sheet").TechnicalSheet; description: string; specifications: string; quantity: number; amount: string | number };
export type Quote = {
  id: string; number: number; status: "draft" | "approved"; version: number; revision: number;
  current_version_id: string; created_at: string; approved_at: string | null; approval_note: string | null;
  customer_id: string | null;
};
export type QuoteVersion = { id: string; revision: number; recipient_name: string; recipient_phone: string; notes: string; created_at: string; customer_id: string | null };
export type Order = {
  id: string; number: number; quote_id: string | null; quote_version_id: string | null; customer_id: string;
  customer_snapshot: Omit<Customer, "version" | "cuit"> & { cuit?: string }; total: string | number; notes: string; invoiced: boolean; created_at: string; production_revision?: number;
};
export type OrderItem = QuoteItem & { id: string; position: number; production_status: "pending" | "completed"; completion_note?: string; completed_at?: string | null };
export type FormState = { error?: string };
