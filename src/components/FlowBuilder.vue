<template>
  <div class="flow-container" tabindex="0" @keydown="handleKeyDown">
    <n-layout-content>
      <ToolPanel
        :elements="elements"
        :is-running="isRunning"
        :is-stopped="isStopped"
        :selected-node="selectedNode"
        :selected-edge="selectedEdge"
        @add-node="showNodeSelectionMenu"
        @start-flow="startFlow"
        @stop-flow="stopFlow"
        @continue-flow="continueFlow"
        @reset-flow="resetFlow"
        @update-node-label="updateNodeLabel"
        @update-node-command="updateNodeCommand"
        @delete-selected-edge="deleteSelectedEdge"
        @import-json="importJsonConfig"
      />

      <div class="flow-wrapper" ref="flowWrapper">
        <VueFlow
          v-model="elements"
          :style="{ width: '100%', height: '88vh', background: '#fcfcfc' }"
          @node-click="onNodeClick"
          @edge-click="onEdgeClick"
          @update-edge="onUpdateEdge"
          @nodeContextMenu="onNodeContextMenu"
          @pane-click="onPaneClick"
          :connection-mode="connectionMode"
          @connect="onConnect"
          @pane-ready="onPaneReady"
          :node-class="nodeClass"
        >
        </VueFlow>
        <NodeContextMenu
          v-if="showContextMenu && contextMenuNode"
          :node="contextMenuNode"
          :visible="showContextMenu"
          :x="contextMenuPosition.x"
          :y="contextMenuPosition.y"
          @update:visible="showContextMenu = $event"
          @update-label="updateNodeLabel"
          @update-command="updateNodeCommand"
          @update-params="updateNodeParams"
        />
        <NodeSelectionMenu
          v-if="showNodeMenu"
          :show="showNodeMenu"
          :position="nodeMenuPosition"
          @update:show="showNodeMenu = $event"
          @select="addNode"
        />
      </div>
    </n-layout-content>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { VueFlow, Position, useVueFlow, addEdge, Edge } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { NLayoutContent } from 'naive-ui';

import ToolPanel from './ToolPanel.vue';
import NodeContextMenu from './NodeContextMenu.vue';
import NodeSelectionMenu from './NodeSelectionMenu.vue';
import CustomNode from '../types';
// import config from '../types/nodesConfig';

const elements = ref<Array<CustomNode | Edge>>([
  { 
    id: 'start', 
    type: 'input', 
    data: { label: 'start', command: '', processFunction: async () => { console.log('start'); await delay(1000); } }, 
    position: { x: 50, y: 50 },
    sourcePosition: Position.Bottom,
    style: { 
      backgroundColor: '#d0d0d0', 
      color: 'black',
      borderRadius: '10px',
      width: '120px',
      height: '60px'
    },
    draggable: true,
    selectable: true,
    deletable: false
  },
  { 
    id: 'end', 
    type: 'output', 
    data: { label: 'end', command: '', processFunction: async () => { console.log('end'); await delay(1000); } }, 
    position: { x: 500, y: 400 },
    sourcePosition: Position.Top,
    style: { 
      backgroundColor: '#454545', 
      color: 'white',
      borderRadius: '10px',
      width: '120px',
      height: '60px'
    },
    draggable: true,
    selectable: true,
    deletable: false
  },
]);

const { 
  removeEdges, 
  addNodes, 
  updateNode, 
  removeNodes,
  getEdges,
  setNodes,
  setEdges,
  fitView
} = useVueFlow();

const isRunning = ref(false);
const isStopped = ref(false);
const currentStep = ref<string | null>(null);
const selectedNode = ref<CustomNode | null>(null);
const selectedEdge = ref<Edge | null>(null);
const connectionMode = ref(false);
const flowWrapper = ref<HTMLElement | null>(null);

const contextMenuNode = ref<CustomNode | null>(null);
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });

const showNodeMenu = ref(false);
const nodeMenuPosition = ref({ x: 0, y: 0 });

const stepCount = computed(() => {
  let count = 0;
  let currentNode = 'start';
  
  while (currentNode !== 'end') {
    const nextNode = getNextNode(currentNode);
    if (!nextNode || nextNode === 'end') break;
    count++;
    currentNode = nextNode;
  }
  
  return count;
});

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const isProtectedNode = (nodeId: string) => {
  return nodeId === 'start' || nodeId === 'end';
};

const nodeClass = (node: CustomNode) => {
  if (node.type === 'input') return 'input-node';
  if (node.type === 'output') return 'output-node';
  return 'default-node';
};

const onPaneReady = ({ pane }: { pane?: HTMLElement }) => {
  if (pane) {
    pane.tabIndex = 0;
    pane.focus();
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && 
  (event.key === 'x' || event.key === 'ч')) {
    event.preventDefault();
    deleteSelectedNodeWithEdges();
    deleteSelectedEdge();
  }
  if ((event.ctrlKey || event.metaKey) &&
  (event.key === 'a' || event.key === 'ф')) {
    event.preventDefault();
    showNodeSelectionMenu();
  }
};

const deleteSelectedNodeWithEdges = () => {
  if (!selectedNode.value || isProtectedNode(selectedNode.value.id)) {
    console.warn('Нет выбранной ноды для удаления или нода защищена');
    return;
  }

  const nodeId = selectedNode.value.id;
  const edgesToRemove = getEdges.value.filter(
    edge => edge.source === nodeId || edge.target === nodeId
  );

  if (edgesToRemove.length > 0) {
    removeEdges(edgesToRemove);
  }
  
  removeNodes([nodeId]);
  elements.value = elements.value.filter(
    el => el.id !== nodeId && 
    !edgesToRemove.some(edge => edge.id === el.id)
  );
  
  selectedNode.value = null;
  closeContextMenu();
  updateStepNumbers();
};

const showNodeSelectionMenu = (event?: MouseEvent) => {
  if (event) {
    nodeMenuPosition.value = {
      x: event.clientX,
      y: event.clientY
    };
  } else {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    nodeMenuPosition.value = { x: centerX, y: centerY };
  }
  showNodeMenu.value = true;
};

const addNode = (nodeData: { label: string, params: any[] }) => {
  const newNodeId = uuidv4();
  
  const params = nodeData.params.reduce((acc, param) => {
    acc[param.name] = param.default !== undefined ? param.default : '';
    return acc;
  }, {} as Record<string, any>);

  const newNode: CustomNode = {
    id: newNodeId,
    data: { 
      label: nodeData.label,
      command: '',
      ...params,
      processFunction: async () => { 
        console.log(`Выполняется шаг ${newNodeId}`); 
        await delay(1000); 
      } 
    },
    position: { x: 100 + stepCount.value * 100, y: 150 },
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
    style: { 
      backgroundColor: '#2196F3', 
      color: 'white',
      borderRadius: '50%',
      width: '80px',
      height: '80px'
    }
  };

  elements.value.push(newNode);
  addNodes([newNode]);
  showNodeMenu.value = false;
};

const onConnect = (params: any) => {
  const newEdge = {
    id: `edge-${params.source}-${params.target}`,
    source: params.source,
    target: params.target,
  };
  elements.value = addEdge(newEdge, elements.value);
  connectionMode.value = false;
  updateStepNumbers();
};

const onNodeClick = (event: any) => {
  if (connectionMode.value) return;
  if (isProtectedNode(event.node.id)) {
    selectedNode.value = null;
    selectedEdge.value = null;
    closeContextMenu();
    return;
  }
  selectedNode.value = event.node;
  selectedEdge.value = null;
  closeContextMenu();
};

const onEdgeClick = (event: any) => {
  selectedNode.value = null;
  selectedEdge.value = event.edge;
  closeContextMenu();
};

const onUpdateEdge = (event: any, edge: Edge) => {
  console.log('onUpdateEdge', edge);
}

const onNodeContextMenu = (event: { event: MouseEvent, node: CustomNode }) => {
  if (!event?.node || isProtectedNode(event.node.id)) return;
  
  event.event.preventDefault();
  
  selectedNode.value = event.node;
  contextMenuNode.value = event.node;
  
  const flowWrapperRect = flowWrapper.value?.getBoundingClientRect();
  if (!flowWrapperRect) return;
  
  contextMenuPosition.value = {
    x: event.event.clientX - flowWrapperRect.left,
    y: event.event.clientY - flowWrapperRect.top
  };
  
  showContextMenu.value = true;
};

const onPaneClick = () => {
  closeContextMenu();
};

const closeContextMenu = () => {
  contextMenuNode.value = null;
};

const updateNodeLabel = (newLabel: string) => {
  if (selectedNode.value && !isProtectedNode(selectedNode.value.id)) {
    const nodeIndex = elements.value.findIndex(el => el.id === selectedNode.value?.id);
    if (nodeIndex !== -1) {
      (elements.value[nodeIndex] as CustomNode).data.label = newLabel;
      updateNode(selectedNode.value.id, elements.value[nodeIndex]);
    }
  }
};

const updateNodeCommand = (newCommand: string) => {
  if (selectedNode.value && !isProtectedNode(selectedNode.value.id)) {
    const nodeIndex = elements.value.findIndex(el => el.id === selectedNode.value?.id);
    if (nodeIndex !== -1) {
      (elements.value[nodeIndex] as CustomNode).data.command = newCommand;
      updateNode(selectedNode.value.id, elements.value[nodeIndex]);
    }
  }
};

const updateNodeParams = (newParams: Record<string, any>) => {
  if (selectedNode.value) {
    const nodeIndex = elements.value.findIndex(el => el.id === selectedNode.value?.id);
    if (nodeIndex !== -1) {
      const node = { ...elements.value[nodeIndex] } as CustomNode;
      
      // update all parameters
      Object.keys(newParams).forEach(key => {
        node.data[key] = newParams[key];
      });
      
      // update the node in the array of elements
      elements.value[nodeIndex] = node;
      
      // update the node in VueFlow
      updateNode(node.id, node);
    }
  }
};

const deleteSelectedEdge = () => {
  if (selectedEdge.value) {
    removeEdges([selectedEdge.value]);
    elements.value = elements.value.filter(el => el.id !== selectedEdge.value?.id);
    selectedEdge.value = null;
    updateStepNumbers();
  }
}

const updateStepNumbers = () => {
  // let stepNumber = 1;
  let currentNode = 'start';
  
  while (currentNode !== 'end') {
    const nextNode = getNextNode(currentNode);
    if (!nextNode || nextNode === 'end') break;
    
    const node = elements.value.find(n => n.id === nextNode) as CustomNode;
    if (node && !isProtectedNode(node.id)) {
      updateNode(node.id, node);
      // stepNumber++;
    }
    
    currentNode = nextNode;
  }
};

const importJsonConfig = (jsonConfig: any) => {
  try {
    // guard expression
    if (!jsonConfig?.steps || !Array.isArray(jsonConfig.steps)) {
      throw new Error('Invalid configuration: missing steps array');
    }

    const newNodes: CustomNode[] = [];
    const newEdges: Edge[] = [];
    let xPos = 50;
    const yPos = 150;

    // start node
    newNodes.push({
      id: 'start',
      type: 'input',
      data: { label: 'start', command: '', processFunction: async () => await delay(1000) },
      position: { x: xPos, y: 50 },
      sourcePosition: Position.Bottom,
      style: { 
        backgroundColor: '#d0d0d0',
        color: 'black',
        borderRadius: '10px',
        width: '120px',
        height: '60px'
      },
      draggable: true,
      selectable: true,
      deletable: false
    });
    xPos += 200;

    // steps processing
    jsonConfig.steps.forEach((step: any) => {
      const nodeId = uuidv4();
      // const [nodeType, operationName] = step.name.split('_');
      
      const nodeData: any = {
        label: step.name,
        command: step.command || '',
        processFunction: async () => await delay(1000)
      };

      // add all params from the step to nodeData
      if (step.params) {
        Object.keys(step.params).forEach(paramName => {
          nodeData[paramName] = step.params[paramName];
        });
      }

      // add node
      newNodes.push({
        id: nodeId,
        data: nodeData,
        position: { x: xPos, y: yPos },
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
        style: { 
          backgroundColor: '#2196F3',
          color: 'white',
          borderRadius: '50%',
          width: '80px',
          height: '80px'
        },
        draggable: true,
        selectable: true,
        deletable: true
      });

      // add edge
      if (newNodes.length > 1) {
        const prevNode = newNodes[newNodes.length-2];
        newEdges.push({
          id: `edge-${prevNode.id}-${nodeId}`,
          source: prevNode.id,
          target: nodeId,
        });
      }

      xPos += 200;
    });

    // end node
    newNodes.push({
      id: 'end',
      type: 'output',
      data: { label: 'end', command: '', processFunction: async () => await delay(1000) },
      position: { x: xPos, y: 50 },
      sourcePosition: Position.Top,
      style: { 
        backgroundColor: '#454545',
        color: 'white',
        borderRadius: '10px',
        width: '120px',
        height: '60px'
      },
      draggable: true,
      selectable: true,
      deletable: false
    });

    // linking the last node to end
    if (newNodes.length > 2) {
      const lastStepNode = newNodes[newNodes.length-2];
      newEdges.push({
        id: `edge-${lastStepNode.id}-end`,
        source: lastStepNode.id,
        target: 'end',
      });
    }

    // graph update
    elements.value = [...newNodes, ...newEdges];
    setNodes(newNodes);
    setEdges(newEdges);

    // auto-scaling
    nextTick(() => fitView({ padding: 0.5 }));

  } catch (error) {
    console.error('Graph import error:', error);
  }
};

const startFlow = async () => {
  isRunning.value = true;
  isStopped.value = false;
  currentStep.value = 'start';

  try {
    await executeStep('start');
    let nextNode = getNextNode('start');

    while (nextNode && isRunning.value) {
      currentStep.value = nextNode;
      await executeStep(nextNode);
      nextNode = getNextNode(nextNode);
    }

    if (isRunning.value) {
      currentStep.value = 'end';
      await executeStep('end');
    }
  } catch (error) {
    console.error('Ошибка выполнения графа:', error);
  } finally {
    isRunning.value = false;
    currentStep.value = null;
  }
};

const stopFlow = () => {
  isRunning.value = false;
  isStopped.value = true;
};

const continueFlow = async () => {
  if (!currentStep.value) return;

  isStopped.value = false;
  isRunning.value = true;

  try {
    let nextNode = getNextNode(currentStep.value);

    while (nextNode && isRunning.value) {
      currentStep.value = nextNode;
      await executeStep(nextNode);
      nextNode = getNextNode(nextNode);
    }

    if (isRunning.value) {
      currentStep.value = 'end';
      await executeStep('end');
    }
  } catch (error) {
    console.error('Ошибка выполнения графа:', error);
  } finally {
    isRunning.value = false;
    isStopped.value = false;
    currentStep.value = null;
  }
};

const resetFlow = () => {
  isRunning.value = false;
  isStopped.value = false;
  currentStep.value = null;
};

const executeStep = async (nodeId: string) => {
  const node = elements.value.find((el: any) => el.id === nodeId) as CustomNode;
  if (node?.data?.processFunction) {
    await node.data.processFunction();
  }
};

const getNextNode = (nodeId: string): string | null => {
  const edges = elements.value.filter((el: any) => el.source === nodeId && el.target) as Edge[];
  return edges.length > 0 ? edges[0].target : null;
};

onMounted(() => {
  if (flowWrapper.value) {
    flowWrapper.value.focus();
  }
});
</script>

<style scoped>
.flow-container {
  font-family: sans-serif;
  height: 100vh;
  outline: none;
}

.flow-wrapper {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  outline: none;
  position: relative;
  width: 100%;
  height: 100%;
}

.node-context-menu {
  position: absolute;
}

.node-edit-form {
  padding: 20px;
}
</style>

<style>
.vue-flow__node {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.vue-flow__node.input-node {
  background-color: #d0d0d0 !important;
  border-radius: 10px !important;
  width: 120px !important;
  height: 60px !important;
}

.vue-flow__node.output-node {
  background-color: #454545 !important;
  border-radius: 10px !important;
  width: 120px !important;
  height: 60px !important;
}

.vue-flow__node.default-node {
  background-color: #2196F3 !important;
  border-radius: 50% !important;
  width: 80px !important;
  height: 80px !important;
}

.vue-flow__node.selected {
  box-shadow: 0 0 0 2px #555;
}

.vue-flow__edge-path {
  stroke: #555;
  stroke-width: 2;
}

.vue-flow__handle {
  width: 10px;
  height: 7px;
  background-color: #555;
}

.vue-flow__handle-bottom {
  bottom: -5px;
}

.vue-flow__handle-top {
  top: -5px;
}

.vue-flow__handle-left {
  left: -5px;
}

.vue-flow__handle-right {
  right: -5px;
}
</style>