<template>
  <div class="tool-panel">
    <n-space justify="space-between" align="center" style="padding: 7px 17px">
      <!-- Flow Settings -->
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

      <!-- Flow Management -->
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

      <!-- Edge Settings -->
      <n-space v-if="props.selectedEdge">
        <n-button @click="$emit('delete-selected-edge')" type="error" circle>
          <template #icon>
            <n-icon><delete-icon /></n-icon>
          </template>
        </n-button>
      </n-space>

      <!-- Export/Import -->
      <n-space>
        <!-- Export Buttons -->
        <template v-if="isGraphValid">
          <n-popover trigger="click" :show="showDaguYaml">
            <template #trigger>
              <n-button @click="generateDAGUYaml(); showDaguYaml = !showDaguYaml" ghost color="#c7c7c7" size="small">
                <template #icon>
                  <n-icon><code-icon /></n-icon>
                </template>
                YAML
              </n-button>
            </template>
            <n-card v-if="daguYaml" title="DAGU Config" size="small">
              <n-code language="yaml" :code="daguYaml" word-wrap/>
            </n-card>
          </n-popover>

          <n-button @click="downloadDAGUYaml()" size="small" ghost color="#c7c7c7">
            <template #icon>
              <n-icon><download-icon /></n-icon>
            </template>
            Export YAML
          </n-button>

          <n-popover trigger="click" :show="showPipelineJson">
            <template #trigger>
              <n-button @click="generatePipelineJson(); showPipelineJson = !showPipelineJson" ghost color="#c7c7c7" size="small">
                <template #icon>
                  <n-icon><code-icon /></n-icon>
                </template>
                JSON
              </n-button>
            </template>
            <n-card v-if="pipelineJson" title="Конфигурация JSON" size="small">
              <n-code language="json" :code="pipelineJson" word-wrap/>
            </n-card>
          </n-popover>

          <n-button @click="downloadPipelineJson()" size="small" ghost color="#c7c7c7">
            <template #icon>
              <n-icon><download-icon /></n-icon>
            </template>
            Export JSON
          </n-button>
        </template>

        <!-- Import Button -->
        <input 
          type="file" 
          ref="fileInput"
          accept=".json"
          style="display: none"
          @change="handleFileSelect"
        >
        <n-button 
          @click="triggerFileInput()" 
          ghost 
          color="#c7c7c7" 
          size="small"
        >
          <template #icon>
            <n-icon><upload-icon /></n-icon>
          </template>
          Import JSON
        </n-button>
      </n-space>

      <!-- Tips -->
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
              <n-text><strong>ЛКМ</strong> - Выбрать шаг</n-text>
            </n-list-item>
            <n-list-item>
              <n-text><strong>ПКМ</strong> - Редактировать параметры шага</n-text>
            </n-list-item>
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
import { ref, defineProps, defineEmits, computed, h } from 'vue';
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
  NCode,
  NText,
  // NUpload,
  useMessage
} from 'naive-ui';
import { useVueFlow, Edge } from '@vue-flow/core';
import YAML from 'yaml';
import CustomNode from '../types';
// import config from '../types/nodesConfig';
import { pathsData } from './icons';
import CustomIcon from './icons/CustomIcon.vue';

const {
  getEdges,
  // addEdges,
  // setNodes,
  // setEdges
} = useVueFlow();

const message = useMessage();
const fileInput = ref<HTMLInputElement | null>(null);

// create icon
const createIcon = (iconName: string) => {
  const iconPaths = pathsData?.[iconName];
  return iconPaths ? h(CustomIcon, { paths: iconPaths }) : null;
};

// icons
const QuestionIcon = createIcon('question');
const PlusIcon = createIcon('plus');
const PlayIcon = createIcon('play');
const PauseIcon = createIcon('pause');
const DeleteIcon = createIcon('delete');
const RefreshIcon = createIcon('refresh');
const CodeIcon = createIcon('code');
const DownloadIcon = createIcon('download');
const UploadIcon = createIcon('upload');
const EditIcon = createIcon('edit');

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

const emit = defineEmits([
  'add-node', 'start-flow', 'stop-flow', 'continue-flow',
  'reset-flow', 'update-node-label', 'update-node-command',
  'delete-selected-edge', 'import-json'
]);

const flowName = ref('my_flow');
const flowDescription = ref('My flow\'s description');
const daguYaml = ref('');
const pipelineJson = ref('');
const showPipelineJson = ref(false);
const showDaguYaml = ref(false);
const showHints = ref(false);

const isGraphValid = computed(() => {
  const visited = new Set<string>();
  let currentNode: string | null = 'start';
  
  while (currentNode && currentNode !== 'end') {
    if (visited.has(currentNode)) return false;
    visited.add(currentNode);
    
    const edgesFromCurrent = getEdges.value.filter(e => e.source === currentNode);
    if (edgesFromCurrent.length !== 1) return false;
    
    currentNode = edgesFromCurrent[0].target;
  }
  
  return currentNode === 'end';
});

const getNextNode = (nodeId: string): string | null => {
  const edges = props.elements.filter((el: any) => el.source === nodeId && el.target) as Edge[];
  return edges.length > 0 ? edges[0].target : null;
};

const generateJqFilter = (conditions: any[]) => {
  return conditions
    .filter(cond => cond.field && cond.operator && cond.value !== undefined)
    .map(cond => {
      let value = cond.value;
      
      if (typeof value === 'string') {
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(value)) value = Number(value);
        else if (!value.startsWith('$')) value = `"${value}"`;
      }

      // handle nested fields
      const fieldPath = cond.field.includes('.') 
        ? cond.field.split('.').join('?.') 
        : cond.field;

      // handle operators
      switch(cond.operator) {
        case '==': return `(${fieldPath} == ${value})`;
        case '!=': return `(${fieldPath} != ${value})`;
        case 'contains': return `(${fieldPath} | contains(${value}))`;
        default: return `(${fieldPath} ${cond.operator} ${value})`;
      }
    })
    .join(' and ');
};

const generateDAGUYaml = () => {
  const steps = [];
  let currentNode = 'start';
  
  while (currentNode !== 'end') {
    const nextNode = getNextNode(currentNode);
    if (!nextNode || nextNode === 'end') break;
    
    const node = props.elements.find(n => n.id === nextNode) as CustomNode;
    if (node && !isProtectedNode(node.id)) {
      const step: any = {
        name: node.data.label,
      };

      // Обработка proc_get_request
      if (node.data.label === 'proc_get_request') {
        step.executor = {
          type: 'http',
          config: {
            silent: true,
            headers: node.data.headers
          }
        };
        step.command = `GET ${node.data.url}`;
        step.output = 'USER_DATA';
        
        if (node.data.headers && node.data.headers.length > 0) {
          step.executor.config.headers = node.data.headers.reduce((acc: Record<string, string>, header: string) => {
            const [key, value] = header.split(':').map(s => s.trim());
            if (key && value) acc[key] = value;
            return acc;
          }, {});
        }
      } 
      // Обработка proc_json_filter
      else if (node.data.label === 'proc_json_filter') {
        step.executor = 'jq';
        
        const jqConditions = generateJqFilter(node.data.conditions || []);
        let jqCommand = `${node.data.list || ''}[]`;
        
        if (jqConditions) {
          jqCommand += ` | select(${jqConditions})`;
        }
        
        if (node.data.output_fields?.length > 0) {
          jqCommand += ` | {${node.data.output_fields.join(', ')}}`;
        }
        
        step.command = jqCommand;
        step.script = '{{ .PREVIOUS_STEP_OUTPUT }}';
        step.output = 'FILTERED_DATA';
      }
      // Обработка других типов узлов
      else {
        step.command = node.data.command || '';
      }
      
      steps.push(step);
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

const generatePipelineJson = () => {
  const steps = [];
  let currentNode = 'start';
  
  while (currentNode !== 'end') {
    const nextNode = getNextNode(currentNode);
    if (!nextNode || nextNode === 'end') break;
    
    const node = props.elements.find(n => n.id === nextNode) as CustomNode;
    if (node && !isProtectedNode(node.id)) {
      const step: any = {
        name: node.data.label,
        command: node.data.command || '',
      };

      const allParams = Object.keys(node.data)
        .filter(key => !['label', 'command', 'processFunction'].includes(key))
        .reduce((acc, key) => {
          acc[key] = node.data[key];
          return acc;
        }, {} as Record<string, any>);
      
      if (Object.keys(allParams).length > 0) {
        step.params = allParams;
      }
      
      steps.push(step);
    }
    currentNode = nextNode;
  }
  
  const pipelineConfig = {
    name: flowName.value,
    description: flowDescription.value,
    steps: steps
  };
  
  pipelineJson.value = JSON.stringify(pipelineConfig, null, 2);
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

const downloadPipelineJson = () => {
  if (!pipelineJson.value) return;
  
  const blob = new Blob([pipelineJson.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${flowName.value}.json`.replace(/\s+/g, '_');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};


// functions of import
const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  if (!file) return;

  try {
    const content = await readFileAsText(file);
    const jsonConfig = JSON.parse(content);
    
    if (!jsonConfig || typeof jsonConfig !== 'object') {
      throw new Error('Invalid JSON format');
    }
    
    flowName.value = jsonConfig.name || 'imported_flow';
    flowDescription.value = jsonConfig.description || '';
    
    emit('import-json', jsonConfig);
    message.success('Flow импортирован успешно');
  } catch (error) {
    message.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Import error:', error);
  } finally {
    if (input) input.value = '';
  }
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsText(file);
  });
};

/*
const handleJsonImport = async (options: { file: File } | FileList | null) => {
  try {
    // Обрабатываем разные варианты входных данных
    let file: File | null = null;
    
    if (options instanceof FileList) {
      file = options[0];
    } else if (options && 'file' in options) {
      file = options.file;
    }

    if (!file) {
      throw new Error('Файл не выбран');
    }

    // Читаем содержимое файла
    const fileContent = await readFile(file);
    const jsonConfig = JSON.parse(fileContent);
    
    // Валидация структуры
    if (!jsonConfig?.steps || !Array.isArray(jsonConfig.steps)) {
      throw new Error('Некорректная структура JSON');
    }
    
    // Обновляем название и описание
    flowName.value = jsonConfig.name || 'imported_flow';
    flowDescription.value = jsonConfig.description || '';
    
    // Передаем конфиг в FlowBuilder
    emit('import-json', jsonConfig);
    
    message.success('Граф успешно импортирован');
  } catch (error) {
    console.error('Ошибка импорта:', error);
    message.error(`Ошибка импорта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
};

const readFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(new Error('Ошибка чтения файла: ' + e));
    reader.readAsText(file);
  });
};
*/ 

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
  margin-bottom: 0;
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