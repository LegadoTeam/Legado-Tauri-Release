<script setup lang="ts">
import { ref } from 'vue'
import type { BookItem } from '../../composables/useScriptBridge'
import type { AggregatedBook, TaggedBookItem } from './AggregatedSearchResults.vue'
import defaultLogoUrl from '../../assets/booksource-default.svg'

const props = defineProps<{
  group: AggregatedBook
  showCover?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', book: BookItem, fileName: string): void
}>()

const showSourcePicker = ref(false)

const fallbackCover = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160">' +
  '<rect width="120" height="160" rx="4" fill="%233a3a45"/>' +
  '<rect x="15" y="18" width="6" height="124" rx="2" fill="%23555568"/>' +
  '<rect x="21" y="18" width="84" height="124" rx="2" fill="%23464658" stroke="%23555568" stroke-width="0.5"/>' +
  '<rect x="97" y="22" width="4" height="116" rx="1" fill="%234e4e62"/>' +
  '<path d="M46 58 C46 58 53 55 60 58 L60 82 C53 79 46 82 46 82 Z" fill="%23606078"/>' +
  '<path d="M74 58 C74 58 67 55 60 58 L60 82 C67 79 74 82 74 82 Z" fill="%23555570"/>' +
  '<line x1="60" y1="58" x2="60" y2="82" stroke="%237a7a92" stroke-width="0.8"/>' +
  '<text x="60" y="105" text-anchor="middle" fill="%237a7a92" font-size="10" font-family="sans-serif">暂无封面</text>' +
  '</svg>'
)}`

function handleClick() {
  if (props.group.sources.length > 1) {
    showSourcePicker.value = true
  } else {
    const item = props.group.primary
    emit('select', item.book, item.fileName)
  }
}

function selectSource(item: TaggedBookItem) {
  showSourcePicker.value = false
  emit('select', item.book, item.fileName)
}
</script>

<template>
  <div
    class="stacked-card"
    :class="{ 'stacked-card--multi': group.sources.length > 1 }"
    @click="handleClick"
  >
    <!-- 堆叠层（仅多来源时显示底牌） -->
    <div v-if="group.sources.length > 2" class="stacked-card__layer stacked-card__layer--3" />
    <div v-if="group.sources.length > 1" class="stacked-card__layer stacked-card__layer--2" />

    <!-- 主卡片 -->
    <div class="stacked-card__main">
      <img
        v-if="showCover"
        class="stacked-card__cover"
        :src="group.primary.book.coverUrl || fallbackCover"
        :alt="group.primary.book.name"
        loading="lazy"
        @error="($event.target as HTMLImageElement).src = fallbackCover"
      />
      <div class="stacked-card__info">
        <span class="stacked-card__name" :title="group.primary.book.name">
          {{ group.primary.book.name }}
        </span>
        <span class="stacked-card__author" :title="group.primary.book.author">
          {{ group.primary.book.author }}
        </span>
        <div class="stacked-card__tags">
          <n-tag v-if="group.primary.book.kind" size="tiny" :bordered="false" class="stacked-card__tag">
            {{ group.primary.book.kind }}
          </n-tag>
        </div>
        <span v-if="group.primary.book.lastChapter" class="stacked-card__latest" :title="group.primary.book.lastChapter">
          {{ group.primary.book.lastChapter }}
        </span>
      </div>
      <!-- 多来源角标 -->
      <span v-if="group.sources.length > 1" class="stacked-card__badge">
        {{ group.sources.length }} 源
      </span>
    </div>
  </div>

  <!-- 来源选择弹窗 -->
  <n-modal
    v-model:show="showSourcePicker"
    preset="card"
    :title="`选择来源 — ${group.primary.book.name}`"
    :style="{ maxWidth: '420px', width: '90vw' }"
    size="small"
    :bordered="false"
    :segmented="{ content: true }"
  >
    <div class="source-picker">
      <div
        v-for="item in group.sources"
        :key="item.fileName"
        class="source-picker__item"
        @click="selectSource(item)"
      >
        <img
          class="source-picker__logo"
          :src="(item.sourceLogo && item.sourceLogo.toLowerCase() !== 'default') ? item.sourceLogo : defaultLogoUrl"
          :alt="item.sourceName"
          @error="($event.target as HTMLImageElement).src = defaultLogoUrl"
        />
        <div class="source-picker__info">
          <span class="source-picker__name">{{ item.sourceName }}</span>
          <span v-if="item.book.lastChapter" class="source-picker__chapter">
            {{ item.book.lastChapter }}
          </span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="source-picker__arrow"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.stacked-card {
  position: relative;
  cursor: pointer;
  /* 为堆叠层留空间 */
  padding-top: 0;
  margin-top: 0;
}
.stacked-card--multi {
  padding-top: 0;
  margin-bottom: 6px;
}

/* ── 堆叠底牌 ── */
.stacked-card__layer {
  position: absolute;
  left: 0;
  right: 0;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-raised);
  pointer-events: none;
}
.stacked-card__layer--2 {
  top: -4px;
  bottom: 4px;
  left: 4px;
  right: -4px;
  opacity: 0.6;
  z-index: 0;
}
.stacked-card__layer--3 {
  top: -8px;
  bottom: 8px;
  left: 8px;
  right: -8px;
  opacity: 0.35;
  z-index: -1;
}

/* ── 主卡片 ── */
.stacked-card__main {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-raised);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.stacked-card:hover .stacked-card__main {
  border-color: var(--color-accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stacked-card__cover {
  width: 48px;
  height: 64px;
  object-fit: cover;
  border-radius: var(--radius-xs);
  flex-shrink: 0;
  background: var(--color-surface);
}

.stacked-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  justify-content: center;
}

.stacked-card__name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.stacked-card__author {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.stacked-card__tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.stacked-card__tag {
  --n-color: var(--color-surface-hover) !important;
  --n-text-color: var(--color-text-muted) !important;
  font-size: 0.625rem !important;
}

.stacked-card__latest {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

/* ── 来源角标 ── */
.stacked-card__badge {
  position: absolute;
  top: 4px;
  right: 6px;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 0.625rem;
  font-weight: 600;
  color: #fff;
  background: var(--color-accent, #6366f1);
  line-height: 1.4;
  z-index: 2;
}

/* ── 来源选择弹窗 ── */
.source-picker {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.source-picker__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.source-picker__item:hover {
  background: var(--color-surface-hover);
}

.source-picker__logo {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-xs);
  object-fit: contain;
  flex-shrink: 0;
}

.source-picker__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.source-picker__name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.source-picker__chapter {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-picker__arrow {
  flex-shrink: 0;
  color: var(--color-text-muted);
  opacity: 0.5;
}
</style>
