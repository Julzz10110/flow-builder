<template>
  <n-dropdown
    v-model:show="showMenu"
    :options="nodeOptions"
    :x="position.x"
    :y="position.y"
    placement="bottom-start"
    trigger="manual"
    @select="handleNodeSelect"
  >
    <div style="position: absolute; left: -9999px"></div>
  </n-dropdown>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue';
import { NDropdown } from 'naive-ui';
import nodesConfig from '../types/nodesConfig'

const props = defineProps({
  show: Boolean,
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
});

const emit = defineEmits(['select', 'update:show']);

const showMenu = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
});

const nodeOptions = computed(() => {
  const options = [];
  
  for (const [section, nodes] of Object.entries(nodesConfig)) {
    options.push({
      type: 'group',
      label: section.toUpperCase(),
      key: section,
      children: nodes.map(node => ({
        label: `${section}_${node.name}`,
        key: `${section}_${node.name}`,
        nodeData: node
      }))
    });
  }
  
  return options;
});

const handleNodeSelect = (key: string, option: any) => {
  emit('select', {
    label: key,
    params: option.nodeData.params
  });
  showMenu.value = false;
};
</script>