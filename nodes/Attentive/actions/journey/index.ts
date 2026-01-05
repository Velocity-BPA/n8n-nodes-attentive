/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { attentiveApiRequest, attentiveApiRequestAllItems } from '../../transport';
import { buildReturnData } from '../../utils';

export const journeyOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['journey'],
      },
    },
    options: [
      {
        name: 'Get',
        value: 'get',
        description: 'Get journey details',
        action: 'Get journey',
      },
      {
        name: 'Get All',
        value: 'getAll',
        description: 'Get all journeys',
        action: 'Get all journeys',
      },
      {
        name: 'Get Stats',
        value: 'getStats',
        description: 'Get journey statistics',
        action: 'Get journey stats',
      },
    ],
    default: 'getAll',
  },
];

export const journeyFields: INodeProperties[] = [
  // Journey ID for get, getStats
  {
    displayName: 'Journey ID',
    name: 'journeyId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['journey'],
        operation: ['get', 'getStats'],
      },
    },
    default: '',
    description: 'The ID of the journey',
  },
  // Get all options
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['journey'],
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
        resource: ['journey'],
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
        resource: ['journey'],
        operation: ['getAll'],
      },
    },
    options: [
      {
        displayName: 'Status',
        name: 'status',
        type: 'options',
        options: [
          { name: 'Active', value: 'active' },
          { name: 'Paused', value: 'paused' },
          { name: 'Draft', value: 'draft' },
        ],
        default: 'active',
        description: 'Filter by journey status',
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
        resource: ['journey'],
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

export async function executeJourneyOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  let responseData: IDataObject | IDataObject[];

  switch (operation) {
    case 'get': {
      const journeyId = this.getNodeParameter('journeyId', i) as string;

      responseData = await attentiveApiRequest.call(this, 'GET', `/journeys/${journeyId}`);
      break;
    }

    case 'getAll': {
      const returnAll = this.getNodeParameter('returnAll', i) as boolean;
      const filters = this.getNodeParameter('filters', i) as IDataObject;

      const query: IDataObject = {};

      if (filters.status) {
        query.status = filters.status;
      }

      if (returnAll) {
        responseData = await attentiveApiRequestAllItems.call(
          this,
          'GET',
          '/journeys',
          {},
          query,
          'journeys',
        );
      } else {
        const limit = this.getNodeParameter('limit', i) as number;
        query.limit = limit;
        const response = await attentiveApiRequest.call(this, 'GET', '/journeys', {}, query);
        responseData = (response.journeys as IDataObject[]) || [];
      }
      break;
    }

    case 'getStats': {
      const journeyId = this.getNodeParameter('journeyId', i) as string;
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
        `/journeys/${journeyId}/stats`,
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
