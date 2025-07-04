<template>
  <div 
    v-if="visible"
    class="node-context-menu"
    :style="positionStyle"
  >
    <n-card title="Редактирование шага" size="small" style="width: 350px">
      <n-form>
        <n-form-item label="Название шага">
          <n-input 
            v-model:value="localLabel" 
            @blur="updateLabel"
          />
        </n-form-item>
        
        <n-form-item label="Команда">
          <n-input 
            v-model:value="localCommand" 
            @blur="updateCommand"
          />
        </n-form-item>

        <template v-if="nodeParams.length > 0">
          <n-form-item 
            v-for="param in nodeParams" 
            :key="param.name"
            :label="param.name"
          >
            <!-- Enum Params -->
            <n-select
              v-if="param.type === 'string' && param.enum"
              v-model:value="localParams[param.name]"
              :options="param.enum.map(e => ({ label: e, value: e }))"
            />
            
            <!-- String Params -->
            <n-input
              v-else-if="param.type === 'string'"
              v-model:value="localParams[param.name]"
            />
            
            <!-- Boolean Params -->
            <n-switch
              v-else-if="param.type === 'boolean'"
              v-model:value="localParams[param.name]"
            />
            
            <!-- Number Params -->
            <n-input-number
              v-else-if="param.type === 'number'"
              v-model:value="localParams[param.name]"
            />
          </n-form-item>
        </template>

        <div style="display: flex; justify-content: flex-end; margin-top: 20px">
          <n-button @click="saveAndClose" type="primary">
            Сохранить
          </n-button>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineProps, defineEmits } from 'vue';
import { 
  NInput, NButton, NCard, NForm, NFormItem,
  NSelect, NSwitch, NInputNumber 
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

// get parameters for the current node
const nodeParams = computed(() => {
  if (!props.node?.data?.label) return [];
  
  // search in the config
  const [nodeType, operationName] = props.node.data.label.split('_');
  const operations = nodesConfig[nodeType];
  const operation =  operations?.find(op => op.name === operationName);
  if (operation) {
      return operation.params;
    }
  return [];
});

watch(() => props.node, (newNode) => {
  if (newNode) {
    localLabel.value = newNode.data.label;
    localCommand.value = newNode.data.command || '';

    nodeParams.value.forEach(param => {
      localParams.value[param.name] = newNode.data[param.name] !== undefined 
        ? newNode.data[param.name] 
        : param.default;
    });
  }
}, { immediate: true });

const positionStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
  position: 'absolute',
  zIndex: 1000
}));

const saveAndClose = () => {
  emit('update-label', localLabel.value);
  emit('update-command', localCommand.value);
  
  const paramsToUpdate: Record<string, any> = {};
  nodeParams.value.forEach(param => {
    if (localParams.value[param.name] !== undefined) {
      paramsToUpdate[param.name] = localParams.value[param.name];
    }
  });
  
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