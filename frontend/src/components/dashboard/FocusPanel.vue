<script setup>
defineProps({ title: String, emptyText: String, to: String })
</script>
<template><section class="focus-panel"><header><h2>{{ title }}</h2><RouterLink :to="to">查看全部 →</RouterLink></header><slot><p class="empty-text">{{ emptyText }}</p></slot></section></template>
<style scoped>
.focus-panel { padding: 22px; border: 1px solid #e5e3df; border-radius: 10px; }
header { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 18px; }
h2 { font-size: 15px; margin: 0; } a { font-size: 12px; color: #787671; text-decoration: none; white-space: nowrap; } a:hover { color: #5645d4; }
.empty-text { color: #787671; font-size: 13px; padding: 22px 0; text-align: center; }
</style>
