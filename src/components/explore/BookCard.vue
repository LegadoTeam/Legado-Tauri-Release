<script setup lang="ts">
import type { BookItem } from '../../composables/useScriptBridge'

withDefaults(defineProps<{
  book: BookItem
  showCover?: boolean
}>(), { showCover: true })
defineEmits<{ (e: 'select', book: BookItem): void }>()

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
</script>

<template>
  <div class="book-card" @click="$emit('select', book)">
    <img
      v-if="showCover"
      class="book-card__cover"
      :src="book.coverUrl || fallbackCover"
      :alt="book.name"
      loading="lazy"
      @error="($event.target as HTMLImageElement).src = fallbackCover"
    />
    <div class="book-card__info">
      <span class="book-card__name" :title="book.name">{{ book.name }}</span>
      <span class="book-card__author" :title="book.author">{{ book.author }}</span>
      <div class="book-card__tags">
        <n-tag v-if="book.kind" size="tiny" :bordered="false" class="book-card__tag">
          {{ book.kind }}
        </n-tag>
      </div>
      <span v-if="book.lastChapter" class="book-card__latest" :title="book.lastChapter">
        {{ book.lastChapter }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.book-card {
  display: flex;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-raised);
  cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.book-card:hover {
  border-color: var(--color-accent);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
}

.book-card__cover {
  width: var(--explore-cover-w, 42px);
  height: var(--explore-cover-h, 56px);
  object-fit: cover;
  border-radius: var(--radius-xs);
  flex-shrink: 0;
  background: var(--color-surface);
}

.book-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  justify-content: center;
}

.book-card__name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.book-card__author {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.book-card__tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.book-card__tag {
  --n-color: var(--color-surface-hover) !important;
  --n-text-color: var(--color-text-muted) !important;
  font-size: 0.625rem !important;
}

.book-card__latest {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}
</style>
