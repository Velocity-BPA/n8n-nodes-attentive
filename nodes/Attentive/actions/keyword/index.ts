/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { attentiveApiRequest, attentiveApiRequestAllItems } from '../../transport';
import { buildReturnData } from '../../utils';

export const keywordOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['keyword'],
      },
    },
    options: [
      {
        name: 'Get',
        value: 'get',
        description: 'Get keyword details',
        action: 'Get keyword',
      },
      {
        name: 'Get All',
        value: 'getAll',
        description: 'Get all keywords',
        action: 'Get all keywords',
      },
    ],
    default: 'getAll',
  },
];

export const keywordFields: INodeProperties[] = [
  // Keyword ID
  {
    displayName: 'Keyword ID',
    name: 'keywordId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['keyword'],
        operation: ['get'],
      },
    },
    default: '',
    description: 'The ID of the keyword',
  },
  // Get all options
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['keyword'],
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
        resource: ['keyword'],
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
];

export async function executeKeywordOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  let responseData: IDataObject | IDataObject[];

  switch (operation) {
    case 'get': {
      const keywordId = this.getNodeParameter('keywordId', i) as string;

      responseData = await attentiveApiRequest.call(this, 'GET', `/keywords/${keywordId}`);
      break;
    }

    case 'getAll': {
      const returnAll = this.getNodeParameter('returnAll', i) as boolean;

      if (returnAll) {
        responseData = await attentiveApiRequestAllItems.call(
          this,
          'GET',
          '/keywords',
          {},
          {},
          'keywords',
        );
      } else {
        const limit = this.getNodeParameter('limit', i) as number;
        const response = await attentiveApiRequest.call(this, 'GET', '/keywords', {}, { limit });
        responseData = (response.keywords as IDataObject[]) || [];
      }
      break;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return buildReturnData(responseData);
}
