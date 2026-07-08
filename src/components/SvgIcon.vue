<template>
  <span
    v-html="icons[name]"
    class="svg-icon"
    :style="{ width: size, height: size }"
    aria-hidden="true"
  ></span>
</template>

<script setup>
import calendarIcon from '../assets/icons/calendar.svg?raw';
import cheerIcon from '../assets/icons/cheer.svg?raw';
import externalLinkIcon from '../assets/icons/external-link.svg?raw';
import groupIcon from '../assets/icons/group.svg?raw';

const icons = {
  calendar: calendarIcon,
  cheer: cheerIcon,
  'external-link': externalLinkIcon,
  group: groupIcon
};

defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: '1em'
  }
});
</script>

<style scoped>
.svg-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: currentColor;
  vertical-align: -0.125em;
}

.svg-icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
