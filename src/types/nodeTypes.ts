import type { NodesConfig, NodeConfig, NodeParamType, NodeParamItemConfig } from './nodesConfig';

type BaseParamToType<T extends NodeParamType> =
  T extends 'string' ? string :
  T extends 'number' ? number :
  T extends 'boolean' ? boolean :
  never;

type ArrayParamToType<T extends NodeParamItemConfig> = 
  Array<BaseParamToType<T['type']>>;

type ParamToType<T extends NodeParamType, I extends NodeParamItemConfig | undefined> =
  T extends 'array' 
    ? I extends NodeParamItemConfig 
      ? ArrayParamToType<I> 
      : Array<any>
    : BaseParamToType<T>;

type GenerateNodeData<T extends NodeConfig> = {
  label: string;
  command: string;
  processFunction: () => Promise<void>;
} & {
  [P in T['params'][number] as P['name']]: 
    P extends { required: true }
      ? ParamToType<P['type'], P['item']>
      : (ParamToType<P['type'], P['item']> | undefined)
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