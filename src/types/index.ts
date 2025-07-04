// index.ts
import type { Node } from '@vue-flow/core';
import type { AllNodeDataTypes } from './nodeTypes';

interface CustomNode extends Node<AllNodeDataTypes> {}

export default CustomNode;