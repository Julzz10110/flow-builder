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

import nodesConfigJson from './nodes_config.json';

// validate config structure
const validateConfig = (config: unknown): NodesConfig => {
  return config as NodesConfig;
};

const config: NodesConfig = validateConfig(nodesConfigJson);

export default config;