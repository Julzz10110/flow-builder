// nodeTypes.ts
import type { NodesConfig, NodeConfig, NodeParamType } from './nodesConfig';
import config from './nodesConfig';

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
    P['required'] extends true 
      ? ParamToType<P['type']>
      : ParamToType<P['type']> | undefined
};

type NodeDataMap = {
  [K in keyof typeof config]: {
    [N in typeof config[K][number]['name']]: 
      GenerateNodeData<Extract<typeof config[K][number], { name: N }>>
  }
};

type AllNodeDataTypes = {
  [K in keyof NodeDataMap]: NodeDataMap[K][keyof NodeDataMap[K]]
}[keyof NodeDataMap];

export type { NodeDataMap, AllNodeDataTypes };