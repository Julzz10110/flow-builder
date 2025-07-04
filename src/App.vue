<template>
  <!-- <n-layout-header bordered>
    <n-space justify="space-between" align="center" style="padding: 0 20px">
      <n-h1 style="margin: 0">Flow Builder</n-h1>
    </n-space>
  </n-layout-header> -->
  <n-config-provider :hljs="hljs">
    <n-message-provider>
      <FlowBuilder />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import {
  // NLayoutHeader,
  // NH1,
  // NSpace,
} from 'naive-ui';
  import FlowBuilder from './components/FlowBuilder.vue';

  import hljs from 'highlight.js/lib/core'
  import javascript from 'highlight.js/lib/languages/javascript'

  hljs.registerLanguage('javascript', javascript);
</script>
