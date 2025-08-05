<template>
  <div v-if="visible" class="node-context-menu" :style="positionStyle">
    <n-card title="Редактирование шага" size="small" style="width: 350px">
      <n-form>
        <n-form-item label="Название шага">
          <n-input v-model:value="localLabel" @blur="updateLabel" />
        </n-form-item>
        
        <!-- General Params -->
        <template v-for="param in currentParams" :key="param.name">
          <!-- Param 'list' for json_filter -->
          <n-form-item v-if="param.name === 'list' && node.data.label === 'proc_json_filter'" label="Путь к массиву">
            <n-input
              v-model:value="localParams[param.name]"
              placeholder="Например: .users"
            />
          </n-form-item>
          
          <!-- Filter Conditions -->
          <n-form-item v-else-if="param.name === 'conditions' && node.data.label === 'proc_json_filter'" label="Условия фильтрации">
            <div v-for="(cond, index) in localParams.conditions" :key="index" class="condition-row">
              <n-input 
                v-model:value="cond.field" 
                placeholder="Поле"
                style="width: 120px; margin-right: 8px"
              />
              <n-select
                v-model:value="cond.operator"
                :options="operatorOptions"
                style="width: 100px; margin-right: 8px"
              />
              <n-input
                v-model:value="cond.value"
                placeholder="Значение"
                style="flex: 1"
              />
              <n-button 
                @click="removeCondition(index)" 
                type="error" 
                text
                style="margin-left: 8px"
              >
                <n-icon><delete-icon /></n-icon>
              </n-button>
            </div>
            <n-button @click="addCondition" type="primary" size="small" style="margin-top: 8px">
              Добавить условие
            </n-button>
          </n-form-item>

          <!-- Output Fields -->
          <n-form-item v-else-if="param.name === 'output_fields' && node.data.label === 'proc_json_filter'" label="Выводимые поля">
            <n-dynamic-tags v-model:value="localParams.output_fields" />
          </n-form-item>

          <!-- Other Params -->
          <n-form-item v-else :label="param.name">
            <n-input
              v-if="param.type === 'string' && !param.enum"
              v-model:value="localParams[param.name]"
              :placeholder="param.required ? 'Обязательное поле' : ''"
            />
            <n-select
              v-else-if="param.type === 'string' && param.enum"
              v-model:value="localParams[param.name]"
              :options="param.enum.map(e => ({ label: e, value: e }))"
            />
            <n-input-number
              v-else-if="param.type === 'number'"
              v-model:value="localParams[param.name]"
            />
            <n-switch
              v-else-if="param.type === 'boolean'"
              v-model:value="localParams[param.name]"
            />
            <n-dynamic-tags
              v-else-if="param.type === 'array' && param.item?.type === 'string'"
              v-model:value="localParams[param.name]"
            />
          </n-form-item>
        </template>

        <div style="display: flex; justify-content: flex-end; margin-top: 20px">
          <n-button @click="saveAndClose" type="primary">Сохранить</n-button>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, h, defineProps, defineEmits } from 'vue';
import { 
  NInput, NButton, NCard, NForm, NFormItem, 
  NSelect, NSwitch, NInputNumber, NDynamicTags, NIcon
} from 'naive-ui';
import { pathsData } from './icons';
import CustomIcon from './icons/CustomIcon.vue';
import nodesConfig from '@/types/nodesConfig';
import { useMessage } from 'naive-ui';

const message = useMessage();

// create icon (todo: remove dublicate code)
const createIcon = (iconName: string) => {
  const iconPaths = pathsData?.[iconName];
  return iconPaths ? h(CustomIcon, { paths: iconPaths }) : null;
};

const DeleteIcon = createIcon('delete');


const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  visible: Boolean,
  x: Number,
  y: Number
});

const emit = defineEmits([
  'update:visible', 
  'update-label', 
  'update-command',
  'update-params'
]);

const localLabel = ref('');
const localCommand = ref('');
const localParams = ref<Record<string, any>>({
  conditions: [],
  output_fields: []
});


const operatorOptions = [
  { label: '=', value: '==' },
  { label: '≠', value: '!=' },
  { label: '>', value: '>' },
  { label: '<', value: '<' },
  { label: '≥', value: '>=' },
  { label: '≤', value: '<=' },
  { label: 'содержит', value: 'contains' },
];

const currentParams = computed(() => {
  if (!props.node?.data?.label) return [];

  for (const category of Object.values(nodesConfig)) {
    const nodeConfig = category.find(n => props.node.data.label.includes(n.name));
    if (nodeConfig) {
      return nodeConfig.params || [];
    }
  }
  return [];
});

watch(() => props.node, (newNode) => {
  if (newNode?.data) {
    localLabel.value = newNode.data.label;
    localCommand.value = newNode.data.command || '';
    localParams.value = {
      conditions: [],
      output_fields: []
    };
    
    currentParams.value.forEach(param => {
      if (param.name === 'conditions') {
        // ensure that conditions will be an array
        localParams.value.conditions = Array.isArray(newNode.data[param.name]) 
          ? [...newNode.data[param.name]]
          : [{ field: '', operator: '==', value: '' }];
      } 
      else if (param.name === 'output_fields') {
        // ensure that output_fields will be an array
        localParams.value.output_fields = Array.isArray(newNode.data[param.name]) 
          ? [...newNode.data[param.name]]
          : [];
      }
      else {
        localParams.value[param.name] = newNode.data[param.name] !== undefined 
          ? newNode.data[param.name] 
          : param.default !== undefined 
            ? param.default 
            : param.type === 'array' 
              ? [] 
              : param.type === 'boolean' 
                ? false 
                : '';
      }
    });
  }
}, { immediate: true, deep: true });

const positionStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
  position: 'absolute',
  zIndex: 1000
}));

const addCondition = () => {
  if (!localParams.value.conditions) {
    localParams.value.conditions = [];
  }
  localParams.value.conditions.push({
    field: '',
    operator: '==',
    value: ''
  });
};

const removeCondition = (index: number) => {
  localParams.value.conditions.splice(index, 1);
};

const validateConditions = () => {
  if (!localParams.value.conditions) return true;
  
  return localParams.value.conditions.every(cond => 
    cond.field && cond.operator && cond.value !== undefined
  );
};

const updateLabel = () => {
  emit('update-label', localLabel.value);
};

const saveAndClose = () => {
  if (localLabel.value === 'proc_json_filter' && !validateConditions()) {
    message.error('Заполните все поля условий фильтрации');
    return;
  }
  
  emit('update-label', localLabel.value);
  emit('update-command', localCommand.value);
  emit('update-params', { ...localParams.value });
  emit('update:visible', false);
};
</script>

<style scoped>
.node-context-menu {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}
.n-form-item {
  margin-bottom: 16px;
}
.condition-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
</style>