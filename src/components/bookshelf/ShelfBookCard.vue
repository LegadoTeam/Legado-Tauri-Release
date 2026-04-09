<script setup lang="ts">
import type { ShelfBook } from '../../composables/useBookshelf'

defineProps<{ book: ShelfBook }>()
defineEmits<{
  (e: 'select', book: ShelfBook): void
  (e: 'contextmenu', book: ShelfBook, event: MouseEvent): void
}>()

const fallbackCover = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160">' +
  '<rect width="120" height="160" rx="6" fill="%233a3a45"/>' +
  '<rect x="15" y="18" width="6" height="124" rx="2" fill="%23555568"/>' +
  '<rect x="21" y="18" width="84" height="124" rx="2" fill="%23464658" stroke="%23555568" stroke-width="0.5"/>' +
  '<rect x="97" y="22" width="4" height="116" rx="1" fill="%234e4e62"/>' +
  '<path d="M46 58 C46 58 53 55 60 58 L60 82 C53 79 46 82 46 82 Z" fill="%23606078"/>' +
  '<path d="M74 58 C74 58 67 55 60 58 L60 82 C67 79 74 82 74 82 Z" fill="%23555570"/>' +
  '<line x1="60" y1="58" x2="60" y2="82" stroke="%237a7a92" stroke-width="0.8"/>' +
  '<text x="60" y="105" text-anchor="middle" fill="%237a7a92" font-size="10" font-family="sans-serif">暂无封面</text>' +
  '</svg>'
)}`

function progressPercent(book: ShelfBook): number {
  if (book.totalChapters <= 0 || book.readChapterIndex < 0) return 0
  return Math.min(100, Math.round(((book.readChapterIndex + 1) / book.totalChapters) * 100))
}

function progressLabel(book: ShelfBook): string {
  if (book.readChapterIndex < 0) return '未开始'
  if (book.totalChapters <= 0) return '阅读中'
  const pct = progressPercent(book)
  if (pct >= 100) return '已读完'
  return `${pct}%`
}
</script>

<template>
  <div
    class="shelf-card"
    @click="$emit('select', book)"
    @contextmenu.prevent="$emit('contextmenu', book, $event)"
  >
    <div class="shelf-card__cover-wrap">
      <img
        class="shelf-card__cover"
        :src="book.coverUrl || fallbackCover"
        :alt="book.name"
        loading="lazy"
        @error="($event.target as HTMLImageElement).src = fallbackCover"
      />
      <!-- 进度标签 -->
      <span
        class="shelf-card__badge"
        :class="{ 'shelf-card__badge--unread': book.readChapterIndex < 0 }"
      >
        {{ progressLabel(book) }}
      </span>
    </div>
    <div class="shelf-card__info">
      <span class="shelf-card__name" :title="book.name">{{ book.name }}</span>
      <span class="shelf-card__author" :title="book.author">{{ book.author }}</span>
    </div>
    <!-- 进度条 -->
    <div v-if="book.readChapterIndex >= 0 && book.totalChapters > 0" class="shelf-card__progress">
      <div class="shelf-card__progress-bar" :style="{ width: `${progressPercent(book)}%` }" />
    </div>
  </div>
</template>

<style scoped>
.shelf-card {
  display: flex;
  flex-direction: column;
  cursor: pointer;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.shelf-card:hover {
  border-color: var(--color-accent);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.shelf-card__cover-wrap {
  position: relative;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: var(--color-surface);
}
.shelf-card__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.shelf-card__badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 2px 6px;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: var(--radius-xs);
  background: rgba(0, 0, 0, 0.6);
  color: var(--color-accent);
  backdrop-filter: blur(4px);
  line-height: 1.4;
}
.shelf-card__badge--unread {
  color: var(--color-text-muted);
}

.shelf-card__info {
  padding: 6px 8px 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.shelf-card__name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}
.shelf-card__author {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.shelf-card__progress {
  height: 3px;
  background: var(--color-border);
}
.shelf-card__progress-bar {
  height: 100%;
  background: var(--color-accent);
  border-radius: 0 2px 2px 0;
  transition: width 0.3s ease;
}
</style>
