import type { CustomerOption } from "@/features/sales/customer-picker";

export type CustomerAccount = {
  customer: CustomerOption;
  credit: number;
  balance: number;
  orders: { id: string; number: number; balance: number }[];
};

export type CustomerPayment = {
  id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  paid_on: string;
  method: string;
  description: string;
  credit_remaining: number;
  allocations: { order_id: string; number: number; amount: number; kind: string; applied_at: string }[];
};
