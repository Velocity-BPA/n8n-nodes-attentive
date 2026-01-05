/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { attentiveApiRequest, attentiveApiRequestAllItems } from '../../transport';
import { buildReturnData } from '../../utils';

export const signUpUnitOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['signUpUnit'],
      },
    },
    options: [
      {
        name: 'Get',
        value: 'get',
        description: 'Get sign-up unit details',
        action: 'Get sign-up unit',
      },
      {
        name: 'Get All',
        value: 'getAll',
        description: 'Get all sign-up units',
        action: 'Get all sign-up units',
      },
      {
        name: 'Get Stats',
        value: 'getStats',
        description: 'Get sign-up unit statistics',
        action: 'Get sign-up unit stats',
      },
    ],
    default: 'getAll',
  },
];

export const signUpUnitFields: INodeProperties[] = [
  // Sign-up unit ID
  {
    displayName: 'Sign-Up Unit ID',
    name: 'signUpUnitId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['signUpUnit'],
        operation: ['get', 'getStats'],
      },
    },
    default: '',
    description: 'The ID of the sign-up unit',
  },
  // Get all options
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['signUpUnit'],
        operation: ['getAll'],
      },
    },
    default: false,
    description: 'Whether to return all results or only up to a given limit',
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    displayOptions: {
      show: {
        resource: ['signUpUnit'],
        operation: ['getAll'],
        returnAll: [false],
      },
    },
    typeOptions: {
      minValue: 1,
      maxValue: 100,
    },
    default: 50,
    description: 'Max number of results to return',
  },
  // Filter options
  {
    displayName: 'Filters',
    name: 'filters',
    type: 'collection',
    placeholder: 'Add Filter',
    default: {},
    displayOptions: {
      show: {
        resource: ['signUpUnit'],
        operation: ['getAll'],
      },
    },
    options: [
      {
        displayName: 'Type',
        name: 'type',
        type: 'options',
        options: [
          { name: 'Popup', value: 'popup' },
          { name: 'Form', value: 'form' },
          { name: 'Keyword', value: 'keyword' },
        ],
        default: 'popup',
        description: 'Filter by sign-up unit type',
      },
    ],
  },
  // Stats date range
  {
    displayName: 'Date Range',
    name: 'dateRange',
    type: 'collection',
    placeholder: 'Add Date Range',
    default: {},
    displayOptions: {
      show: {
        resource: ['signUpUnit'],
        operation: ['getStats'],
      },
    },
    options: [
      {
        displayName: 'Start Date',
        name: 'startDate',
        type: 'dateTime',
        default: '',
        description: 'Start date for statistics',
      },
      {
        displayName: 'End Date',
        name: 'endDate',
        type: 'dateTime',
        default: '',
        description: 'End date for statistics',
      },
    ],
  },
];

export async function executeSignUpUnitOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  let responseData: IDataObject | IDataObject[];

  switch (operation) {
    case 'get': {
      const signUpUnitId = this.getNodeParameter('signUpUnitId', i) as string;

      responseData = await attentiveApiRequest.call(
        this,
        'GET',
        `/sign-up-units/${signUpUnitId}`,
      );
      break;
    }

    case 'getAll': {
      const returnAll = this.getNodeParameter('returnAll', i) as boolean;
      const filters = this.getNodeParameter('filters', i) as IDataObject;

      const query: IDataObject = {};

      if (filters.type) {
        query.type = filters.type;
      }

      if (returnAll) {
        responseData = await attentiveApiRequestAllItems.call(
          this,
          'GET',
          '/sign-up-units',
          {},
          query,
          'signUpUnits',
        );
      } else {
        const limit = this.getNodeParameter('limit', i) as number;
        query.limit = limit;
        const response = await attentiveApiRequest.call(this, 'GET', '/sign-up-units', {}, query);
        responseData = (response.signUpUnits as IDataObject[]) || [];
      }
      break;
    }

    case 'getStats': {
      const signUpUnitId = this.getNodeParameter('signUpUnitId', i) as string;
      const dateRange = this.getNodeParameter('dateRange', i) as IDataObject;

      const query: IDataObject = {};

      if (dateRange.startDate) {
        query.startDate = new Date(dateRange.startDate as string).toISOString();
      }

      if (dateRange.endDate) {
        query.endDate = new Date(dateRange.endDate as string).toISOString();
      }

      responseData = await attentiveApiRequest.call(
        this,
        'GET',
        `/sign-up-units/${signUpUnitId}/stats`,
        {},
        query,
      );
      break;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return buildReturnData(responseData);
}
