export type NodeParamType = 'string' | 'number' | 'boolean' | 'array';

export interface NodeParamItemConfig {
  type: 'string' | 'number' | 'boolean';
}

export interface NodeParamConfig {
  name: string;
  type: NodeParamType;
  required?: boolean;
  default?: any;
  enum?: string[];
  item?: NodeParamItemConfig;
}

export interface NodeConfig {
  name: string;
  params: NodeParamConfig[];
}

export interface NodesConfig {
  [category: string]: NodeConfig[];
}

import nodesConfigJson from './nodes_config.json';

const validateConfig = (config: unknown): NodesConfig => {
  return config as NodesConfig;
};

const config: NodesConfig = validateConfig(nodesConfigJson);

export default config;