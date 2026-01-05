/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IDataObject } from 'n8n-workflow';

export type AttentiveResource =
  | 'subscriber'
  | 'message'
  | 'customEvent'
  | 'customAttribute'
  | 'ecommerce'
  | 'segment'
  | 'journey'
  | 'signUpUnit'
  | 'keyword'
  | 'webhook';

export type SubscriberOperation = 'subscribe' | 'unsubscribe' | 'get' | 'update';
export type MessageOperation = 'send' | 'sendBulk' | 'sendTransactional';
export type CustomEventOperation = 'send' | 'sendBatch';
export type CustomAttributeOperation = 'set' | 'setBatch' | 'delete';
export type EcommerceOperation = 'productView' | 'addToCart' | 'removeFromCart' | 'purchase' | 'abandoned';
export type SegmentOperation = 'create' | 'get' | 'getAll' | 'update' | 'delete' | 'getMembers';
export type JourneyOperation = 'getAll' | 'get' | 'getStats';
export type SignUpUnitOperation = 'getAll' | 'get' | 'getStats';
export type KeywordOperation = 'getAll' | 'get';
export type WebhookOperation = 'create' | 'getAll' | 'delete';

export interface ISubscriber {
  phone?: string;
  email?: string;
  signUpSourceId?: string;
  subscriptionType?: 'MARKETING' | 'TRANSACTIONAL';
  locale?: string;
  customAttributes?: IDataObject;
  notifications?: boolean;
  externalIdentifiers?: IDataObject;
}

export interface IMessage {
  to: string;
  body: string;
  mediaUrl?: string;
  subscriptionType?: 'MARKETING' | 'TRANSACTIONAL';
  messageName?: string;
  useShortLinks?: boolean;
  skipFatigue?: boolean;
  externalId?: string;
  metadata?: IDataObject;
}

export interface IBulkMessage {
  recipients: Array<{
    phone: string;
    customAttributes?: IDataObject;
  }>;
  body: string;
  mediaUrl?: string;
  subscriptionType?: 'MARKETING' | 'TRANSACTIONAL';
  messageName?: string;
  useShortLinks?: boolean;
}

export interface ICustomEvent {
  type: string;
  phone?: string;
  email?: string;
  occurredAt?: string;
  properties?: IDataObject;
  externalId?: string;
}

export interface ICustomAttribute {
  phone?: string;
  email?: string;
  properties: IDataObject;
}

export interface IProductItem {
  productId: string;
  productVariantId?: string;
  name: string;
  price: number;
  quantity: number;
  productImage?: string;
  productUrl?: string;
  category?: string[];
}

export interface IEcommerceEvent {
  phone?: string;
  email?: string;
  items: IProductItem[];
  orderId?: string;
  currency?: string;
  totalAmount?: number;
  discountAmount?: number;
  shippingAmount?: number;
  taxAmount?: number;
  externalId?: string;
  occurredAt?: string;
}

export interface ISegment {
  id?: string;
  name: string;
  description?: string;
  conditions?: IDataObject;
}

export interface IJourney {
  id: string;
  name?: string;
  status?: 'active' | 'paused' | 'draft';
}

export interface ISignUpUnit {
  id: string;
  name?: string;
  type?: 'popup' | 'form' | 'keyword';
}

export interface IKeyword {
  keyword: string;
  responseMessage?: string;
  status?: string;
}

export interface IWebhook {
  id?: string;
  url: string;
  events: string[];
  secret?: string;
  status?: string;
}

export interface IAttentiveApiResponse {
  data?: IDataObject | IDataObject[];
  meta?: {
    total?: number;
    offset?: number;
    limit?: number;
  };
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

export interface IPaginationOptions {
  offset?: number;
  limit?: number;
}

export const WEBHOOK_EVENTS = [
  'subscription.created',
  'subscription.opted_out',
  'message.sent',
  'message.delivered',
  'message.clicked',
  'message.replied',
  'message.failed',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];
