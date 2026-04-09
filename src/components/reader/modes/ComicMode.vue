<script setup lang="ts">
/**
 * ComicMode — 漫画阅读模式（纯竖向滚动，显示图片列表）
 *
 * content 格式约定：书源 chapterContent() 返回的文本为 JSON 数组字符串，
 * 例如 `["https://img1.jpg","https://img2.jpg"]`；或以换行分隔的 URL 列表。
 *
 * 支持两种图片加载模式（由 useAppConfig 的 comic_cache_enabled 控制）：
 * - 缓存模式（默认）：Rust 后端并发下载 → 本地缓存 → base64 Data URL
 * - 直读模式：前端直接使用图片 URL，浏览器自动加载
 */
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { comicDownloadImages, comicGetCachedPage } from '../../../composables/useBookSource'
import { useAppConfig } from '../../../composables/useAppConfig'

const props = defineProps<{
  content: string
  fileName: string
  chapterUrl: string
  hasPrev: boolean
  hasNext: boolean
}>()

const emit = defineEmits<{
  (e: 'tap', zone: 'left' | 'center' | 'right'): void
  (e: 'prevChapter'): void
  (e: 'nextChapter'): void
}>()

const { comicCacheEnabled } = useAppConfig()
const containerRef = ref<HTMLDivElement | null>(null)
const imageDataUrls = ref<string[]>([])
const loading = ref(false)
const error = ref('')

/** 解析 content 为图片 URL 数组 */
function parseImageUrls(raw: string): string[] {
  const trimmed = raw.trim()
  // 尝试 JSON 数组
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed)
      if (Array.isArray(arr)) return arr.filter((u: unknown) => typeof u === 'string' && u.length > 0)
    } catch { /* fallback */ }
  }
  // 换行分隔
  return trimmed.split('\n').map(s => s.trim()).filter(s => s.length > 0 && s.startsWith('http'))
}

/** 加载图片（根据缓存开关选择模式） */
async function loadImages() {
  const urls = parseImageUrls(props.content)
  if (urls.length === 0) {
    imageDataUrls.value = []
    return
  }

  // 直读模式：不经过 Rust 后端，直接使用原始 URL
  if (!comicCacheEnabled.value) {
    imageDataUrls.value = urls
    return
  }

  // 缓存模式：Rust 后端下载 → 本地缓存 → base64 Data URL
  loading.value = true
  error.value = ''
  try {
    await comicDownloadImages(props.fileName, props.chapterUrl, urls)

    const results: string[] = []
    for (let i = 0; i < urls.length; i++) {
      try {
        const dataUrl = await comicGetCachedPage(props.fileName, props.chapterUrl, i)
        results.push(dataUrl)
      } catch {
        results.push(urls[i])
      }
    }
    imageDataUrls.value = results
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
    // fallback：直接使用原始 URL
    imageDataUrls.value = urls
  } finally {
    loading.value = false
  }
}

watch(() => props.content, loadImages, { immediate: true })

/* ── 触控区域 ── */
function onTapContainer(e: MouseEvent | TouchEvent) {
  const el = containerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = 'touches' in e ? e.changedTouches[0].clientX : e.clientX
  const ratio = (x - rect.left) / rect.width
  if (ratio < 0.3) emit('tap', 'left')
  else if (ratio > 0.7) emit('tap', 'right')
  else emit('tap', 'center')
}

/* ── 滚动到底/顶切章 ── */
const reachedBottom = ref(false)

function onScroll() {
  const el = containerRef.value
  if (!el) return
  const threshold = 50
  reachedBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
}

function onScrollEnd() {
  if (reachedBottom.value && props.hasNext) {
    emit('nextChapter')
  }
}

/** 滚轮/触摸到顶部时切上一章（仅在滚动位置已为 0 时触发） */
let topBounce = 0
function onWheel(e: WheelEvent) {
  const el = containerRef.value
  if (!el) return
  if (el.scrollTop <= 0 && e.deltaY < 0) {
    topBounce++
    if (topBounce >= 3 && props.hasPrev) {
      topBounce = 0
      emit('prevChapter')
    }
  } else {
    topBounce = 0
  }
}

/* ── 图片懒加载观察器 ── */
const visibleImages = ref<Set<number>>(new Set())
let observer: IntersectionObserver | null = null

function setupObserver() {
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const idx = Number((entry.target as HTMLElement).dataset.idx)
        if (entry.isIntersecting) visibleImages.value.add(idx)
      }
    },
    { root: containerRef.value, rootMargin: '200px 0px' },
  )
}

const shouldShow = (idx: number) => visibleImages.value.has(idx)

onMounted(() => setupObserver())
onBeforeUnmount(() => observer?.disconnect())

/** 注册图片元素到观察器 */
function observeImg(el: Element | null, idx: number) {
  if (el && observer) {
    (el as HTMLElement).dataset.idx = String(idx)
    observer.observe(el)
  }
}

/* ── 页码显示 ── */
const currentPage = computed(() => {
  if (!containerRef.value) return 1
  // 找到最后一个可见的图片索引
  const sorted = [...visibleImages.value].sort((a, b) => a - b)
  return sorted.length > 0 ? sorted[0] + 1 : 1
})
const totalPages = computed(() => imageDataUrls.value.length)
</script>

<template>
  <div
    ref="containerRef"
    class="comic-mode"
    @click="onTapContainer"
    @scroll="onScroll"
    @scrollend="onScrollEnd"
    @wheel="onWheel"
  >
    <div v-if="loading" class="comic-mode__loading">
      <n-spin size="large" />
      <span>加载图片中...</span>
    </div>

    <div v-else-if="error" class="comic-mode__error">
      <n-alert type="warning" :title="error" />
    </div>

    <template v-else>
      <div
        v-for="(src, idx) in imageDataUrls"
        :key="idx"
        :ref="(el) => observeImg(el as Element, idx)"
        class="comic-mode__page"
      >
        <img
          v-if="shouldShow(idx)"
          :src="src"
          :alt="`第 ${idx + 1} 页`"
          class="comic-mode__img"
          loading="lazy"
        />
        <div v-else class="comic-mode__placeholder">
          {{ idx + 1 }}
        </div>
      </div>

      <!-- 底部提示 -->
      <div class="comic-mode__footer">
        <span v-if="hasNext">滚动到底部加载下一章</span>
        <span v-else>已是最后一章</span>
      </div>
    </template>

    <!-- 页码指示器 -->
    <div v-if="totalPages > 0" class="comic-mode__indicator">
      {{ currentPage }} / {{ totalPages }}
    </div>
  </div>
</template>

<style scoped>
.comic-mode {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: #111;
  -webkit-overflow-scrolling: touch;
}

.comic-mode__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--color-text-muted);
}

.comic-mode__error {
  padding: 24px;
}

.comic-mode__page {
  width: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.comic-mode__img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

.comic-mode__placeholder {
  width: 100%;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 1.5rem;
  opacity: 0.3;
}

.comic-mode__footer {
  padding: 24px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.comic-mode__indicator {
  position: fixed;
  bottom: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  pointer-events: none;
  z-index: 20;
}
</style>
