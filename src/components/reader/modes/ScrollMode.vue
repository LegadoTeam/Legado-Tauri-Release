<script setup lang="ts">
/**
 * ScrollMode — 滚动翻页模式
 *
 * 类似长网页式无限滚动阅读，支持触摸滚动和鼠标滚轮。
 * 左右点击不翻页，只有中间点击切换菜单。
 * 底部/顶部提供章节切换按钮。
 */
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps<{
  content: string
  paragraphSpacing: number
  textIndent: number
  hasPrev?: boolean
  hasNext?: boolean
}>()

const emit = defineEmits<{
  (e: 'progress', ratio: number): void
  (e: 'reachStart'): void
  (e: 'reachEnd'): void
  (e: 'tap', zone: 'left' | 'center' | 'right'): void
  (e: 'prev-chapter'): void
  (e: 'next-chapter'): void
}>()

const scrollRef = ref<HTMLElement | null>(null)

const paragraphs = ref<string[]>([])

/** 是否已滚动到底部附近 */
const atBottom = ref(false)
/** 是否已滚动到顶部 */
const atTop = ref(true)

watch(
  () => props.content,
  (val) => {
    paragraphs.value = val.split(/\n+/).filter(p => p.trim())
    atBottom.value = false
    atTop.value = true
    nextTick(() => {
      if (scrollRef.value) scrollRef.value.scrollTop = 0
    })
  },
  { immediate: true },
)

function onScroll() {
  const el = scrollRef.value
  if (!el) return
  const { scrollTop, scrollHeight, clientHeight } = el
  const ratio = scrollHeight <= clientHeight ? 1 : scrollTop / (scrollHeight - clientHeight)
  emit('progress', Math.min(1, Math.max(0, ratio)))

  atTop.value = scrollTop <= 0
  atBottom.value = scrollTop + clientHeight >= scrollHeight - 2

  if (atTop.value) emit('reachStart')
  if (atBottom.value) emit('reachEnd')
}

/** 允许父组件滚动到指定比例位置 */
function scrollToRatio(ratio: number) {
  const el = scrollRef.value
  if (!el) return
  const max = el.scrollHeight - el.clientHeight
  el.scrollTop = max * Math.min(1, Math.max(0, ratio))
}

/** 点击 → 仅中间区域切换菜单 */
function onClick(e: MouseEvent) {
  // 不拦截按钮点击
  if ((e.target as HTMLElement).closest('.scroll-mode__chapter-btn')) return
  emit('tap', 'center')
}

const showPrevBtn = computed(() => props.hasPrev && atTop.value)
const showNextBtn = computed(() => props.hasNext && atBottom.value)

defineExpose({ scrollToRatio })
</script>

<template>
  <div
    ref="scrollRef"
    class="scroll-mode"
    @scroll.passive="onScroll"
    @click="onClick"
  >
    <!-- 上一章按钮（滚动到顶部时显示） -->
    <Transition name="scroll-btn-fade">
      <button
        v-if="showPrevBtn"
        class="scroll-mode__chapter-btn scroll-mode__chapter-btn--top"
        @click="emit('prev-chapter')"
      >
        ← 上一章
      </button>
    </Transition>

    <div class="scroll-mode__body">
      <p
        v-for="(para, i) in paragraphs"
        :key="i"
        class="scroll-mode__para"
        :style="{
          textIndent: `${textIndent}em`,
          marginBottom: `${paragraphSpacing}px`,
        }"
      >
        {{ para }}
      </p>
    </div>

    <!-- 下一章按钮（滚动到底部时显示） -->
    <Transition name="scroll-btn-fade">
      <button
        v-if="showNextBtn"
        class="scroll-mode__chapter-btn scroll-mode__chapter-btn--bottom"
        @click="emit('next-chapter')"
      >
        下一章 →
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.scroll-mode {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  touch-action: manipulation;
}

.scroll-mode__body {
  padding: var(--reader-padding, 24px);
  min-height: 100%;
}

.scroll-mode__para {
  font-family: var(--reader-font-family);
  font-size: var(--reader-font-size);
  line-height: var(--reader-line-height);
  letter-spacing: var(--reader-letter-spacing);
  word-spacing: var(--reader-word-spacing);
  font-weight: var(--reader-font-weight);
  font-style: var(--reader-font-style);
  text-align: var(--reader-text-align);
  text-decoration: var(--reader-text-decoration);
  text-transform: var(--reader-text-transform);
  font-variant: var(--reader-font-variant);
  writing-mode: var(--reader-writing-mode);
  -webkit-text-stroke-width: var(--reader-text-stroke-width);
  -webkit-text-stroke-color: var(--reader-text-stroke-color);
  text-shadow: var(--reader-text-shadow);
  color: var(--reader-text-color);
  word-break: break-all;
  overflow-wrap: break-word;
  /* 允许浏览器合成粗体/斜体（解决中文字体无独立字重变体时加粗无效问题） */
  font-synthesis: weight style;
  /* 抗锯齿渲染优化（解决合成层中文字体锦齿丢失导致的锯齿感） */
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.scroll-mode ::selection {
  background-color: var(--reader-selection-color);
}

/* 自定义滚动条 */
.scroll-mode::-webkit-scrollbar {
  width: 4px;
}
.scroll-mode::-webkit-scrollbar-track {
  background: transparent;
}
.scroll-mode::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.3);
  border-radius: 2px;
}

/* 章节切换按钮 */
.scroll-mode__chapter-btn {
  display: block;
  width: calc(100% - 48px);
  margin: 12px auto;
  padding: 12px 0;
  border: 1px solid rgba(128, 128, 128, 0.3);
  border-radius: 8px;
  background: transparent;
  color: var(--reader-text-color, inherit);
  font-size: 0.9rem;
  cursor: pointer;
  text-align: center;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.scroll-mode__chapter-btn:hover {
  opacity: 1;
}

.scroll-mode__chapter-btn--top {
  margin-top: 8px;
  margin-bottom: 0;
}

.scroll-mode__chapter-btn--bottom {
  margin-top: 0;
  margin-bottom: 8px;
}

/* 按钮过渡动画 */
.scroll-btn-fade-enter-active,
.scroll-btn-fade-leave-active {
  transition: opacity 0.2s ease;
}
.scroll-btn-fade-enter-from,
.scroll-btn-fade-leave-to {
  opacity: 0;
}
</style>
