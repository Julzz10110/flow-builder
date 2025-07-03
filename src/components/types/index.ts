import type { Node } from '@vue-flow/core';

interface NodeData {
  label: string;
  command: string;
  processFunction: () => Promise<void>;
}

interface CustomNode extends Node<NodeData> {}

export default CustomNode;