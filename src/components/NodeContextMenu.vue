<template>
  <div 
    v-if="visible"
    class="node-context-menu"
    :style="positionStyle"
  >
    <div class="menu-content">
      <n-input 
        v-model:value="localLabel" 
        placeholder="Название шага"
        @blur="updateLabel"
      />
      <n-input 
        v-model:value="localCommand" 
        placeholder="Команда"
        @blur="updateCommand"
      />
      <n-button @click="close" type="error" size="small">
        Закрыть
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineProps, defineEmits } from 'vue';
import { NInput, NButton } from 'naive-ui';

const props = defineProps({
  node: Object,
  visible: Boolean,
  x: Number,
  y: Number
});

const emit = defineEmits(['update:visible', 'update-label', 'update-command']);

const localLabel = ref(props.node?.data.label || '');
const localCommand = ref(props.node?.data.command || '');

watch(() => props.node, (newNode) => {
  if (newNode) {
    localLabel.value = newNode.data.label;
    localCommand.value = newNode.data.command;
  }
});

const positionStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
  position: 'absolute',
  zIndex: 10
}));

const updateLabel = () => {
  emit('update-label', localLabel.value);
};

const updateCommand = () => {
  emit('update-command', localCommand.value);
};

const close = () => {
  emit('update:visible', false);
};
</script>

<style scoped>
.node-context-menu {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  padding: 10px;
  min-width: 250px;
}

.menu-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>