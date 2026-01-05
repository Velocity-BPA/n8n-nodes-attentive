/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { attentiveApiRequest } from '../../transport';
import {
  formatPhoneNumber,
  validatePhoneNumber,
  cleanObject,
  parseProductItems,
  getTimestamp,
  buildReturnData,
} from '../../utils';

export const ecommerceOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['ecommerce'],
      },
    },
    options: [
      {
        name: 'Abandoned',
        value: 'abandoned',
        description: 'Track abandoned cart/checkout',
        action: 'Track abandoned event',
      },
      {
        name: 'Add To Cart',
        value: 'addToCart',
        description: 'Track add to cart event',
        action: 'Track add to cart',
      },
      {
        name: 'Product View',
        value: 'productView',
        description: 'Track product view event',
        action: 'Track product view',
      },
      {
        name: 'Purchase',
        value: 'purchase',
        description: 'Track purchase event',
        action: 'Track purchase',
      },
      {
        name: 'Remove From Cart',
        value: 'removeFromCart',
        description: 'Track remove from cart event',
        action: 'Track remove from cart',
      },
    ],
    default: 'productView',
  },
];

export const ecommerceFields: INodeProperties[] = [
  // Common identifier fields
  {
    displayName: 'Identifier Type',
    name: 'identifierType',
    type: 'options',
    required: true,
    displayOptions: {
      show: {
        resource: ['ecommerce'],
      },
    },
    options: [
      { name: 'Phone', value: 'phone' },
      { name: 'Email', value: 'email' },
    ],
    default: 'phone',
    description: 'How to identify the customer',
  },
  {
    displayName: 'Phone Number',
    name: 'phone',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['ecommerce'],
        identifierType: ['phone'],
      },
    },
    default: '',
    placeholder: '+19148440001',
    description: 'Phone number in E.164 format',
  },
  {
    displayName: 'Email',
    name: 'email',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['ecommerce'],
        identifierType: ['email'],
      },
    },
    default: '',
    placeholder: 'name@email.com',
    description: 'Email address of the customer',
  },
  // Product items - for all operations
  {
    displayName: 'Products',
    name: 'items',
    type: 'fixedCollection',
    typeOptions: {
      multipleValues: true,
    },
    required: true,
    displayOptions: {
      show: {
        resource: ['ecommerce'],
      },
    },
    default: {},
    options: [
      {
        name: 'items',
        displayName: 'Product',
        values: [
          {
            displayName: 'Product ID',
            name: 'productId',
            type: 'string',
            default: '',
            required: true,
            description: 'Unique product identifier',
          },
          {
            displayName: 'Product Name',
            name: 'name',
            type: 'string',
            default: '',
            required: true,
            description: 'Product name',
          },
          {
            displayName: 'Price',
            name: 'price',
            type: 'number',
            typeOptions: {
              numberPrecision: 2,
            },
            default: 0,
            required: true,
            description: 'Product price',
          },
          {
            displayName: 'Currency',
            name: 'currency',
            type: 'string',
            default: 'USD',
            description: 'Currency code (e.g., USD)',
          },
          {
            displayName: 'Quantity',
            name: 'quantity',
            type: 'number',
            default: 1,
            description: 'Quantity of product',
          },
          {
            displayName: 'Product Variant ID',
            name: 'productVariantId',
            type: 'string',
            default: '',
            description: 'Variant identifier (e.g., size, color)',
          },
          {
            displayName: 'Product Image URL',
            name: 'productImage',
            type: 'string',
            default: '',
            description: 'URL to product image',
          },
          {
            displayName: 'Product URL',
            name: 'productUrl',
            type: 'string',
            default: '',
            description: 'URL to product page',
          },
          {
            displayName: 'Category',
            name: 'category',
            type: 'string',
            default: '',
            description: 'Product category (comma-separated for multiple)',
          },
        ],
      },
    ],
    description: 'Products in the event',
  },
  // Purchase-specific fields
  {
    displayName: 'Order ID',
    name: 'orderId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['ecommerce'],
        operation: ['purchase'],
      },
    },
    default: '',
    description: 'Unique order identifier',
  },
  // Options for purchase
  {
    displayName: 'Order Options',
    name: 'orderOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['ecommerce'],
        operation: ['purchase', 'abandoned'],
      },
    },
    options: [
      {
        displayName: 'Currency',
        name: 'currency',
        type: 'string',
        default: 'USD',
        description: 'Currency code (e.g., USD, EUR)',
      },
      {
        displayName: 'Total Amount',
        name: 'totalAmount',
        type: 'number',
        typeOptions: {
          numberPrecision: 2,
        },
        default: 0,
        description: 'Order total amount',
      },
      {
        displayName: 'Discount Amount',
        name: 'discountAmount',
        type: 'number',
        typeOptions: {
          numberPrecision: 2,
        },
        default: 0,
        description: 'Discount applied',
      },
      {
        displayName: 'Shipping Amount',
        name: 'shippingAmount',
        type: 'number',
        typeOptions: {
          numberPrecision: 2,
        },
        default: 0,
        description: 'Shipping cost',
      },
      {
        displayName: 'Tax Amount',
        name: 'taxAmount',
        type: 'number',
        typeOptions: {
          numberPrecision: 2,
        },
        default: 0,
        description: 'Tax amount',
      },
      {
        displayName: 'External ID',
        name: 'externalId',
        type: 'string',
        default: '',
        description: 'External reference ID',
      },
      {
        displayName: 'Occurred At',
        name: 'occurredAt',
        type: 'dateTime',
        default: '',
        description: 'When the event occurred',
      },
    ],
  },
  // Options for non-purchase events
  {
    displayName: 'Options',
    name: 'eventOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['ecommerce'],
        operation: ['productView', 'addToCart', 'removeFromCart'],
      },
    },
    options: [
      {
        displayName: 'External ID',
        name: 'externalId',
        type: 'string',
        default: '',
        description: 'External reference ID',
      },
      {
        displayName: 'Occurred At',
        name: 'occurredAt',
        type: 'dateTime',
        default: '',
        description: 'When the event occurred',
      },
    ],
  },
];

export async function executeEcommerceOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  // responseData declared as const at assignment
  const identifierType = this.getNodeParameter('identifierType', i) as string;
  const itemsInput = this.getNodeParameter('items', i) as IDataObject;

  const body: IDataObject = {};

  // Set user identifier
  if (identifierType === 'phone') {
    const phone = formatPhoneNumber(this.getNodeParameter('phone', i) as string);
    validatePhoneNumber(phone, this);
    body.user = { phone };
  } else {
    const email = this.getNodeParameter('email', i) as string;
    body.user = { email };
  }

  // Parse product items
  const items = parseProductItems(itemsInput);
  body.items = items;

  let endpoint: string;

  switch (operation) {
    case 'productView': {
      endpoint = '/events/ecommerce/product-view';
      const options = this.getNodeParameter('eventOptions', i) as IDataObject;

      body.occurredAt = getTimestamp(options.occurredAt as string | undefined);

      if (options.externalId) {
        body.externalId = options.externalId;
      }
      break;
    }

    case 'addToCart': {
      endpoint = '/events/ecommerce/add-to-cart';
      const options = this.getNodeParameter('eventOptions', i) as IDataObject;

      body.occurredAt = getTimestamp(options.occurredAt as string | undefined);

      if (options.externalId) {
        body.externalId = options.externalId;
      }
      break;
    }

    case 'removeFromCart': {
      endpoint = '/events/ecommerce/remove-from-cart';
      const options = this.getNodeParameter('eventOptions', i) as IDataObject;

      body.occurredAt = getTimestamp(options.occurredAt as string | undefined);

      if (options.externalId) {
        body.externalId = options.externalId;
      }
      break;
    }

    case 'purchase': {
      endpoint = '/events/ecommerce/purchase';
      const orderId = this.getNodeParameter('orderId', i) as string;
      const options = this.getNodeParameter('orderOptions', i) as IDataObject;

      body.orderId = orderId;
      body.occurredAt = getTimestamp(options.occurredAt as string | undefined);

      if (options.currency) {
        body.currency = options.currency;
      }

      if (options.totalAmount) {
        body.order = {
          total: {
            value: options.totalAmount,
            currency: (options.currency as string) || 'USD',
          },
        };
      }

      if (options.discountAmount) {
        body.discount = {
          value: options.discountAmount,
          currency: (options.currency as string) || 'USD',
        };
      }

      if (options.shippingAmount) {
        body.shipping = {
          value: options.shippingAmount,
          currency: (options.currency as string) || 'USD',
        };
      }

      if (options.taxAmount) {
        body.tax = {
          value: options.taxAmount,
          currency: (options.currency as string) || 'USD',
        };
      }

      if (options.externalId) {
        body.externalId = options.externalId;
      }
      break;
    }

    case 'abandoned': {
      endpoint = '/events/ecommerce/abandoned';
      const options = this.getNodeParameter('orderOptions', i) as IDataObject;

      body.occurredAt = getTimestamp(options.occurredAt as string | undefined);

      if (options.currency) {
        body.currency = options.currency;
      }

      if (options.totalAmount) {
        body.cart = {
          total: {
            value: options.totalAmount,
            currency: (options.currency as string) || 'USD',
          },
        };
      }

      if (options.externalId) {
        body.externalId = options.externalId;
      }
      break;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  const responseData = await attentiveApiRequest.call(this, 'POST', endpoint, cleanObject(body));

  return buildReturnData(responseData);
}
