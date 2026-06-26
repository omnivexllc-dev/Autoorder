export interface Order {
  id: number;
  customer_name: string;
  phone_number: string;
  order_number: string;
  product_name: string;
  price: string;
  status: 'Pending' | 'Calling' | 'Confirmed' | 'Cancelled' | 'No Answer' | 'Failed';
  call_sid?: string | null;
  call_duration?: number | null;
  attempts: number;
  created_at: string;
  called_at?: string | null;
  completed_at?: string | null;
}

export interface TwilioSettings {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface DashboardStats {
  totalOrders: number;
  pending: number;
  calling: number;
  confirmed: number;
  cancelled: number;
  noAnswer: number;
  failed: number;
  totalAttempts: number;
  averageDuration: number;
}
