export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date | string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  age: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  totalSpend?: number;
  orderCount?: number;
  lastOrderDate?: Date | string;
}

export interface Order {
  id: string;
  customerId: string;
  amount: number;
  orderDate: Date | string;
}

export interface Segment {
  id: string;
  name: string;
  description?: string;
  rules: SegmentRules;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SegmentRules {
  spend?: {
    gt?: number;
    lt?: number;
  };
  age?: {
    gt?: number;
    lt?: number;
  };
  city?: string;
  inactiveDays?: number;
}

export type ChannelType = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'RCS';

export type CampaignStatus = 'DRAFT' | 'SENDING' | 'SENT' | 'COMPLETED' | 'FAILED';

export interface Campaign {
  id: string;
  name: string;
  segmentId: string;
  channel: ChannelType;
  message: string;
  status: CampaignStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type DeliveryStatus = 'SENT' | 'DELIVERED' | 'FAILED' | 'OPENED' | 'CLICKED';

export interface Communication {
  id: string;
  campaignId: string;
  customerId: string;
  status: DeliveryStatus;
  sentAt: Date | string;
  updatedAt: Date | string;
}

export interface Event {
  id: string;
  communicationId: string;
  eventType: string; // SENT, DELIVERED, FAILED, OPENED, CLICKED, CONVERTED
  createdAt: Date | string;
}

// API Payloads
export interface SendMessagePayload {
  communicationId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  message: string;
  channel: ChannelType;
}

export interface ReceiptPayload {
  communicationId: string;
  status: DeliveryStatus;
}
