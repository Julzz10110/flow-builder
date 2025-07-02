<template>
  <div class="flow-container" tabindex="0" @keydown="handleKeyDown">
    <div class="header-container">
      <div>
        <h1>Flow Builder</h1>
        <p>Постройте свой пайплайн процессов</p>
      </div>
      <!-- Flow Settings -->
      <div class="pipeline-settings">
        <h3>Настройки пайплайна</h3>
        <div class="settings-row">
          <div class="setting-group">
            <label for="flow-name">Название:</label>
            <input 
              type="text" 
              id="flow-name" 
              v-model="flowName" 
              placeholder="Введите название"
            />
          </div>
          <div class="setting-group">
            <label for="flow-description">Описание:</label>
            <input 
              type="text" 
              id="flow-description" 
              v-model="flowDescription" 
              placeholder="Введите описание"
            />
          </div>
        </div>
      </div>

      <!-- DAGU Section -->
      <div class="dagu-section" v-if="isGraphValid">
        <h3>Конфигурация DAGU</h3>
        <button @click="generateDAGUYaml">Показать YAML</button>
        <button @click="downloadDAGUYaml" :disabled="!daguYaml">Загрузить YAML</button>
        <pre v-if="daguYaml" class="yaml-preview">{{ daguYaml }}</pre>
      </div>

      <button class="hint-button" @click="showHints = !showHints">
        <span>?</span>
        <div class="hint-tooltip" v-if="showHints">
          <p><strong>Ctrl+A</strong> - Добавить новый шаг</p>
          <p><strong>Ctrl+X</strong> - Удалить выбранный шаг</p>
        </div>
      </button>
    </div>

    <div class="controls">
      <button @click="addNode">Добавить шаг</button>
      <button @click="startFlow" :disabled="!isGraphValid || isRunning">Запустить</button>
      <button @click="stopFlow" :disabled="!isRunning || isStopped">Стоп</button>
      <button v-if="isStopped" @click="continueFlow">Продолжить</button>
      <button v-if="isStopped" @click="resetFlow">Сброс</button>
    </div>
    <div v-if="selectedNode && !isProtectedNode(selectedNode.id)">
      <h3>Настройки шага</h3>
      <label for="node-label">Название шага:</label>
      <input type="text" id="node-label" v-model="selectedNode.data.label" @input="updateNodeLabel" />
      <label style="padding-left: 20px;" for="node-command">Команда:</label>
      <input type="text" id="node-command" v-model="selectedNode.data.command" @input="updateNodeCommand" />
    </div>
    <div v-if="selectedEdge">
      <h3>Настройки связи</h3>
      <button @click="deleteSelectedEdge">Удалить связь</button>
    </div>
    <br>
        
    <div class="flow-wrapper" ref="flowWrapper">
      <VueFlow
        v-model="elements"
        :style="{ width: '100%', height: '500px', background: '#fcfcfc' }"
        @node-click="onNodeClick"
        @edge-click="onEdgeClick"
        @updateEdge="onUpdateEdge"
        @edgeContextMenu="onEdgeContextMenu"
        :connection-mode="connectionMode"
        @connect="onConnect"
        @pane-ready="onPaneReady"
        :node-class="nodeClass"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { VueFlow, Position, useVueFlow, addEdge, Edge, Node } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import YAML from 'yaml';

interface NodeData {
  label: string;
  command: string;
  processFunction: () => Promise<void>;
}

interface CustomNode extends Node<NodeData> {}

const flowName = ref('my_flow');
const flowDescription = ref('My flow\'s desciption.');
const daguYaml = ref('');

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
    selectable: false,
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
    selectable: false,
    deletable: false
  },
]);

const { 
  removeEdges, 
  addNodes, 
  updateNode, 
  removeNodes,
  getEdges
} = useVueFlow();

const isRunning = ref(false);
const isStopped = ref(false);
const currentStep = ref<string | null>(null);
const selectedNode = ref<CustomNode | null>(null);
const selectedEdge = ref<Edge | null>(null);
const connectionMode = ref(false);
const flowWrapper = ref<HTMLElement | null>(null);
const showHints = ref(false);

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

const isGraphValid = computed(() => {
  const visited = new Set<string>();
  let currentNode: string | null = 'start';
  
  while (currentNode && currentNode !== 'end') {
    if (visited.has(currentNode)) {
      return false;
    }
    visited.add(currentNode);
    
    const edgesFromCurrent = getEdges.value.filter(e => e.source === currentNode);
    if (edgesFromCurrent.length !== 1) {
      return false;
    }
    
    currentNode = edgesFromCurrent[0].target;
  }
  
  return currentNode === 'end';
});

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
  }
  if ((event.ctrlKey || event.metaKey) &&
  (event.key === 'a' || event.key === 'ф')) {
    event.preventDefault();
    addNode();
  }
};

const deleteSelectedNodeWithEdges = () => {
  if (!selectedNode.value || isProtectedNode(selectedNode.value.id)) {
    console.warn('Нет выбранной ноды для удаления или нода защищена');
    return;
  }

  console.log('Удаление ноды:', selectedNode.value.id);
  
  const nodeId = selectedNode.value.id;
  
  const edgesToRemove = getEdges.value.filter(
    edge => edge.source === nodeId || edge.target === nodeId
  );
  
  console.log('Связанные edges для удаления:', edgesToRemove);

  if (edgesToRemove.length > 0) {
    console.log('Удаление edges');
    removeEdges(edgesToRemove);
  }
  
  console.log('Удаление ноды');
  removeNodes([nodeId]);
  
  elements.value = elements.value.filter(
    el => el.id !== nodeId && 
    !edgesToRemove.some(edge => edge.id === el.id)
  );
  
  selectedNode.value = null;
  updateStepNumbers();
  
  console.log('Удаление завершено, текущие элементы:', elements.value);
};

const addNode = () => {
  const newNodeId = uuidv4();
  const newNode: CustomNode = {
    id: newNodeId,
    data: { 
      label: `Шаг ${stepCount.value + 1}`, 
      command: '',
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
  if (connectionMode.value || isProtectedNode(event.node.id)) return;
  selectedNode.value = event.node;
  selectedEdge.value = null;
};

const onEdgeClick = (event: any) => {
  console.log('Edge click event', event)
  selectedNode.value = null;
  selectedEdge.value = event.edge;
};

const onEdgeContextMenu = (event: any, edge: Edge) => {
  console.log('TEST edge', edge)
  event.preventDefault();
};

const onUpdateEdge = (event: any, edge: Edge) => {
  console.log('onUpdateEdge', edge);
}

const updateNodeLabel = () => {
  if (selectedNode.value && !isProtectedNode(selectedNode.value.id)) {
    updateNode(selectedNode.value.id, { 
      ...selectedNode.value, 
      data: { ...selectedNode.value.data, label: selectedNode.value.data.label } 
    });
  }
};

const updateNodeCommand = () => {
  if (selectedNode.value && !isProtectedNode(selectedNode.value.id)) {
    updateNode(selectedNode.value.id, { 
      ...selectedNode.value, 
      data: { ...selectedNode.value.data, command: selectedNode.value.data.command } 
    });
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
  let stepNumber = 1;
  let currentNode = 'start';
  
  while (currentNode !== 'end') {
    const nextNode = getNextNode(currentNode);
    if (!nextNode || nextNode === 'end') break;
    
    const node = elements.value.find(n => n.id === nextNode) as CustomNode;
    if (node && !isProtectedNode(node.id)) {
      node.data.label = `Шаг ${stepNumber}`;
      updateNode(node.id, node);
      stepNumber++;
    }
    
    currentNode = nextNode;
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
  if (node && node.data && node.data.processFunction) {
    console.log(`Запуск шага: ${node.data.label}`);
    await node.data.processFunction();
    console.log(`Шаг завершен: ${node.data.label}`);
  }
};

const getNextNode = (nodeId: string): string | null => {
  const edges = elements.value.filter((el: any) => el.source === nodeId && el.target) as Edge[];
  return edges.length > 0 ? edges[0].target : null;
};

const generateDAGUYaml = () => {
  const steps = [];
  let currentNode = 'start';
  
  while (currentNode !== 'end') {
    const nextNode = getNextNode(currentNode);
    if (!nextNode || nextNode === 'end') break;
    
    const node = elements.value.find(n => n.id === nextNode) as CustomNode;
    if (node && !isProtectedNode(node.id)) {
      steps.push({
        name: node.data.label,
        command: node.data.command
      });
    }
    
    currentNode = nextNode;
  }
  
  const daguConfig = {
    name: flowName.value,
    description: flowDescription.value,
    steps: steps
  };
  
  daguYaml.value = YAML.stringify(daguConfig);
};

const downloadDAGUYaml = () => {
  if (!daguYaml.value) return;
  
  const blob = new Blob([daguYaml.value], { type: 'application/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${flowName.value}.yaml`.replace(/\s+/g, '_');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  padding: 20px;
  outline: none;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  position: relative;
}

.hint-button {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  cursor: pointer;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  margin-left: 10px;
}

.hint-button span {
  font-size: 18px;
}

.hint-tooltip {
  position: absolute;
  top: 40px;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 100;
  width: 200px;
}

.hint-tooltip p {
  margin: 5px 0;
  font-size: 14px;
}

.controls {
  margin-bottom: 20px;
}

button {
  margin-right: 10px;
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  background-color: #f0f0f0;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #e0e0e0;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  background-color: #f0f0f0;
}

input[type="text"] {
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 10px;
  width: 200px;
}

.flow-wrapper {
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  outline: none;
}

.dagu-section {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 5px;
  background-color: #f9f9f9;
}

.yaml-preview {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
  white-space: pre-wrap;
  font-family: monospace;
  max-height: 200px;
  overflow-y: auto;
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
</style>