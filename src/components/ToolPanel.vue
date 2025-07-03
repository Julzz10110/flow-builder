<template>
  <div class="tool-panel">
    <n-space justify="space-between" align="center" style="padding: 7px 17px">

      <!-- Секция с настройками пайплайна -->
      <n-space style="padding: 0 17px">
        <n-text style="color: #f2f2f2; font-size: 20px" strong>{{ flowName }}</n-text>
        
        <n-popover trigger="click">
          <template #trigger>
            <n-button text style="font-size: 18px" color="#c7c7c7">
              <n-icon><edit-icon /></n-icon>
            </n-button>
          </template>
          <n-card title="Настройки пайплайна" size="small" style="width: 300px">
            <n-form>
              <n-form-item label="Название" path="flowName">
                <n-input 
                  v-model:value="flowName" 
                  placeholder="Введите название"
                />
              </n-form-item>
              <n-form-item label="Описание" path="flowDescription">
                <n-input 
                  v-model:value="flowDescription" 
                  placeholder="Введите описание"
                  type="textarea"
                />
              </n-form-item>
            </n-form>
          </n-card>
        </n-popover>
      </n-space>

      <!-- Секция управления потоком -->
      <n-space>
        <n-button @click="$emit('add-node')" type="primary" circle>
          <template #icon>
            <n-icon><plus-icon /></n-icon>
          </template>
        </n-button>
        <n-button 
          @click="$emit('start-flow')" 
          :disabled="!isGraphValid || props.isRunning"
          type="success"
          circle
        >
          <template #icon>
            <n-icon><play-icon /></n-icon>
          </template>
        </n-button>
        <n-button 
          @click="$emit('stop-flow')" 
          :disabled="!props.isRunning || props.isStopped"
          type="warning"
          circle
        >
          <template #icon>
            <n-icon><pause-icon /></n-icon>
          </template>
        </n-button>

        <!-- <n-button 
          v-if="props.isStopped" 
          @click="$emit('continue-flow')"
          type="info"
          circle
        >
          <template #icon>
            <n-icon><play-icon /></n-icon>
          </template>
        </n-button> -->
        <n-button 
          v-if="props.isStopped" 
          @click="$emit('reset-flow')"
          type="error"
          circle
        >
          <template #icon>
            <n-icon><refresh-icon /></n-icon>
          </template>
        </n-button>
      </n-space>

      <!-- Секция настроек шага -->
      <n-space v-if="props.selectedNode && !isProtectedNode(props.selectedNode.id)">
        <n-input 
          type="text" 
          :value="props.selectedNode.data.label" 
          @update:value="$emit('update-node-label', $event)" 
          placeholder="Название шага"
          size="small"
          style="width: 150px"
        />
        <n-input 
          type="text" 
          :value="props.selectedNode.data.command" 
          @update:value="$emit('update-node-command', $event)" 
          placeholder="Команда"
          size="small"
          style="width: 200px"
        />
      </n-space>

      <!-- Секция настроек связи -->
      <n-space v-if="props.selectedEdge">
        <n-button @click="$emit('delete-selected-edge')" type="error" circle>
          <template #icon>
            <n-icon><delete-icon /></n-icon>
          </template>
        </n-button>
      </n-space>

      <!-- Секция DAGU -->
      <n-space v-if="isGraphValid">
      <n-popover trigger="click" :show="showDaguYaml">
        <template #trigger>
          <n-button @click="generateDAGUYaml(); showDaguYaml = !showDaguYaml" ghost color="#c7c7c7" size="small">
            <template #icon>
              <n-icon><code-icon /></n-icon>
            </template>
            YAML
          </n-button>
        </template>
          <n-card 
          v-if="isGraphValid && daguYaml" 
          title="Конфигурация DAGU" 
          size="small" 
        >
          <n-code language="yaml" :code="daguYaml" word-wrap/>
      </n-card>
      </n-popover>

        <n-button 
          @click="downloadDAGUYaml" 
          :disabled="!daguYaml" 
          size="small"
          ghost
          color="#c7c7c7"
        >
          <template #icon>
            <n-icon><download-icon /></n-icon>
          </template>
          Экспорт
        </n-button>
      </n-space>

      <!-- Секция подсказок -->
      <n-space>
        <n-popover trigger="click" :show="showHints">
                <template #trigger>
                  <n-button @click="showHints = !showHints" ghost color="#c7c7c7" circle>
                    <template #icon>
                      <n-icon><question-icon /></n-icon>
                    </template>
                  </n-button>
                </template>
                <n-list>
                  <n-list-item>
                    <n-text><strong>Ctrl+A</strong> - Добавить новый шаг</n-text>
                  </n-list-item>
                  <n-list-item>
                    <n-text><strong>Ctrl+X</strong> - Удалить выбранный шаг или связь</n-text>
                  </n-list-item>
                </n-list>
              </n-popover>
      </n-space>
    </n-space>

  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, computed, h } from 'vue';
import {
  NButton,
  NIcon,
  NInput,
  NSpace,
  NPopover,
  NList,
  NListItem,
  NCard,
  NForm,
  NFormItem,
  NCode
} from 'naive-ui';
import { useVueFlow, Edge } from '@vue-flow/core';
import YAML from 'yaml';
import CustomNode from './types';
import { pathsData } from './icons';
import CustomIcon from './icons/CustomIcon.vue';

const {
  getEdges
} = useVueFlow();

// Иконки
const QuestionIcon = h(CustomIcon, { paths: pathsData['question']});
const PlusIcon = h(CustomIcon, { paths: pathsData['plus']});
const PlayIcon = h(CustomIcon, { paths: pathsData['play']});
const PauseIcon = h(CustomIcon, { paths: pathsData['pause']});
const DeleteIcon = h(CustomIcon, { paths: pathsData['delete']});
const RefreshIcon = h(CustomIcon, { paths: pathsData['refresh']});
const CodeIcon = h(CustomIcon, { paths: pathsData['code']});
const DownloadIcon = h(CustomIcon, { paths: pathsData['download']});
const EditIcon = h(CustomIcon, { paths: pathsData['edit']});

const props = defineProps({
  elements: {
    type: Array,
    default: () => []
  },
  isRunning: Boolean,
  isStopped: Boolean,
  selectedNode: Object,
  selectedEdge: Object
});

const flowName = ref('my_flow');
const flowDescription = ref('My flow\'s desciption.');
const daguYaml = ref('');

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


const getNextNode = (nodeId: string): string | null => {
  const edges = props.elements.filter((el: any) => el.source === nodeId && el.target) as Edge[];
  return edges.length > 0 ? edges[0].target : null;
};

const generateDAGUYaml = () => {
  const steps = [];
  let currentNode = 'start';
  
  while (currentNode !== 'end') {
    const nextNode = getNextNode(currentNode);
    if (!nextNode || nextNode === 'end') break;
    
    const node = props.elements.find(n => n.id === nextNode) as CustomNode;
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

/*
const emit = defineEmits([
  'add-node',
  'start-flow',
  'stop-flow',
  'continue-flow',
  'reset-flow',
  'update-node-label',
  'update-node-command',
  'delete-selected-edge',
  'generate-dagu-yaml',
  'download-dagu-yaml'
]);
*/

const showHints = ref(false);
const showDaguYaml = ref(false);
// const showSettingsCards = ref(false);

const isProtectedNode = (nodeId: string) => {
  return nodeId === 'start' || nodeId === 'end';
};
</script>

<style scoped>
.tool-panel {
  background-color: #0f0101;
  color: white;
  padding: 5px 0;
  border-radius: 8px;
  margin-bottom: 15px;
}

.settings-cards {
  display: flex;
  gap: 15px;
  margin-top: 10px;
  padding: 0 10px;
}

.settings-cards > * {
  flex: 1;
}
</style>