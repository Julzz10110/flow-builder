import type { NodesConfig, NodeConfig, NodeParamType } from './nodesConfig';

type ParamToType<T extends NodeParamType> =
  T extends 'string' ? string :
  T extends 'number' ? number :
  T extends 'boolean' ? boolean : never;

type GenerateNodeData<T extends NodeConfig> = {
  label: string;
  command: string;
  processFunction: () => Promise<void>;
} & {
  [P in T['params'][number] as P['name']]: 
    P extends { required: true }
      ? ParamToType<P['type']>
      : (ParamToType<P['type']> | undefined)
};

type NodeDataMap = {
  [K in keyof NodesConfig]: {
    [N in NodesConfig[K][number]['name']]: 
      GenerateNodeData<Extract<NodesConfig[K][number], { name: N }>>
  }
};

type AllNodeDataTypes = {
  [K in keyof NodeDataMap]: NodeDataMap[K][keyof NodeDataMap[K]]
}[keyof NodeDataMap];

export type { NodeDataMap, AllNodeDataTypes };