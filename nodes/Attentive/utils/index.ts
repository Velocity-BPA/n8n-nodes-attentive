/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IDataObject, INodeExecutionData, NodeOperationError, IExecuteFunctions } from 'n8n-workflow';

/**
 * Format phone number to E.164 format
 * @param phone - Phone number to format
 * @returns Formatted phone number with + prefix
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) {
    return phone;
  }

  // Strip all non-digit characters except +
  const digits = phone.replace(/[^\d+]/g, '');

  // If starts with +, keep it
  if (digits.startsWith('+')) {
    return digits;
  }

  // Add + prefix if missing
  return `+${digits}`;
}

/**
 * Validate E.164 phone number format
 * @param phone - Phone number to validate
 * @returns true if valid E.164 format
 */
export function isValidE164(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Validate phone number and throw if invalid
 * @param phone - Phone number to validate
 * @param node - Node for error context
 */
export function validatePhoneNumber(phone: string, node: IExecuteFunctions): void {
  const formatted = formatPhoneNumber(phone);
  if (!isValidE164(formatted)) {
    throw new NodeOperationError(
      node.getNode(),
      `Invalid phone number format: "${phone}". Phone numbers must be in E.164 format (e.g., +19148440001).`,
    );
  }
}

/**
 * Clean empty properties from object
 * @param obj - Object to clean
 * @returns Object without empty values
 */
export function cleanObject(obj: IDataObject): IDataObject {
  const cleaned: IDataObject = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedNested = cleanObject(value as IDataObject);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else if (Array.isArray(value) && value.length > 0) {
        cleaned[key] = value;
      } else if (!Array.isArray(value)) {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

/**
 * Parse custom attributes from UI input
 * @param attributesInput - Attributes from UI (key-value pairs)
 * @returns Parsed attributes object
 */
export function parseCustomAttributes(attributesInput: IDataObject): IDataObject {
  const attributes: IDataObject = {};

  if (!attributesInput) {
    return attributes;
  }

  const items = attributesInput.attributes as IDataObject[] | undefined;
  if (items && Array.isArray(items)) {
    for (const item of items) {
      if (item.key && item.value !== undefined) {
        attributes[item.key as string] = item.value;
      }
    }
  }

  return attributes;
}

/**
 * Parse product items from UI input
 * @param itemsInput - Items from UI
 * @returns Parsed product items array
 */
export function parseProductItems(itemsInput: IDataObject): IDataObject[] {
  const items: IDataObject[] = [];

  if (!itemsInput) {
    return items;
  }

  const productItems = itemsInput.items as IDataObject[] | undefined;
  if (productItems && Array.isArray(productItems)) {
    for (const item of productItems) {
      const productItem: IDataObject = {
        productId: item.productId as string,
        name: item.name as string,
        price: {
          value: parseFloat(item.price as string) || 0,
          currency: (item.currency as string) || 'USD',
        },
        quantity: parseInt(item.quantity as string, 10) || 1,
      };

      if (item.productVariantId) {
        productItem.productVariantId = item.productVariantId;
      }
      if (item.productImage) {
        productItem.productImage = item.productImage;
      }
      if (item.productUrl) {
        productItem.productUrl = item.productUrl;
      }
      if (item.category) {
        productItem.category = Array.isArray(item.category)
          ? item.category
          : [item.category as string];
      }

      items.push(productItem);
    }
  }

  return items;
}

/**
 * Build execution result array from API response
 * @param data - Response data
 * @returns Node execution data array
 */
export function buildReturnData(data: IDataObject | IDataObject[]): INodeExecutionData[] {
  if (Array.isArray(data)) {
    return data.map((item) => ({ json: item }));
  }
  return [{ json: data }];
}

/**
 * Get ISO timestamp or current time
 * @param timestamp - Optional timestamp string
 * @returns ISO formatted timestamp
 */
export function getTimestamp(timestamp?: string): string {
  if (timestamp) {
    return new Date(timestamp).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Log licensing notice (once per session)
 */
let licensingNoticeLogged = false;

export function logLicensingNotice(): void {
  if (!licensingNoticeLogged) {
    console.warn(`
[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
`);
    licensingNoticeLogged = true;
  }
}
