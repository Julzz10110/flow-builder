<template>
  <div v-if="visible" class="node-context-menu" :style="positionStyle">
    <n-card title="Редактирование шага" size="small" style="width: 350px">
      <n-form>
        <n-form-item label="Название шага">
          <n-input v-model:value="localLabel" @blur="updateLabel" />
        </n-form-item>
        
        <n-form-item label="Команда">
          <n-input v-model:value="localCommand" @blur="updateCommand" />
        </n-form-item>

        <!-- Dynamic params for all node types -->
        <template v-for="param in currentParams" :key="param.name">
          <n-form-item :label="param.name">
            <!-- String Params -->
            <n-input
              v-if="param.type === 'string' && !param.enum"
              v-model:value="localParams[param.name]"
              :placeholder="param.required ? 'Обязательное поле' : ''"
            />
            
            <!-- Popup enum -->
            <n-select
              v-else-if="param.type === 'string' && param.enum"
              v-model:value="localParams[param.name]"
              :options="param.enum.map(e => ({ label: e, value: e }))"
            />
            
            <!-- Number Params -->
            <n-input-number
              v-else-if="param.type === 'number'"
              v-model:value="localParams[param.name]"
            />
            
            <!-- Boolean Params -->
            <n-switch
              v-else-if="param.type === 'boolean'"
              v-model:value="localParams[param.name]"
            />
            
            <!-- Array<string> Params -->
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
import { ref, watch, computed, defineProps, defineEmits } from 'vue';
import { 
  NInput, NButton, NCard, NForm, NFormItem, 
  NSelect, NSwitch, NInputNumber, NDynamicTags 
} from 'naive-ui';
import nodesConfig from '@/types/nodesConfig';

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
const localParams = ref<Record<string, any>>({});

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
    
    localParams.value = {};
    
    currentParams.value.forEach(param => {
      localParams.value[param.name] = newNode.data[param.name] !== undefined 
        ? newNode.data[param.name] 
        : param.default !== undefined 
          ? param.default 
          : param.type === 'array' 
            ? [] 
            : param.type === 'boolean' 
              ? false 
              : '';
    });
  }
}, { immediate: true, deep: true });

const positionStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
  position: 'absolute',
  zIndex: 1000
}));

const updateLabel = () => {
  emit('update-label', localLabel.value);
};

const updateCommand = () => {
  emit('update-command', localCommand.value);
};

const saveAndClose = () => {
  emit('update-label', localLabel.value);
  emit('update-command', localCommand.value);
  const paramsToUpdate = { ...localParams.value };
  emit('update-params', paramsToUpdate);
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
</style>