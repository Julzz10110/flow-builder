export type NodeParamType = 'string' | 'number' | 'boolean';

export interface NodeParamConfig {
  name: string;
  type: NodeParamType;
  required?: boolean;
  default?: any;
  enum?: string[];
}

export interface NodeConfig {
  name: string;
  params: NodeParamConfig[];
}

export interface NodesConfig {
  [category: string]: NodeConfig[];
}

const config: NodesConfig = {
  proc: [
    {
      name: "comparison",
      params: [
        {
          name: "propertyName",
          type: "string",
          required: true
        },
        {
          name: "order",
          type: "string",
          enum: ["<", ">"],
          required: true,
          default: "<"
        }
      ]
    },
    {
      name: "iterate",
      params: [
        {
          name: "print",
          type: "boolean",
          default: true
        }
      ]
    }
  ],
  bx24: [
    {
      name: "get_deals",
      params: []
    },
    {
      name: "get_deal_by_id",
      params: [
        {
          name: "id",
          type: "string"
        }
      ]
    }
  ]
};

export default config;