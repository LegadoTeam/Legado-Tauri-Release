<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useMessage } from 'naive-ui'
import { openUrl } from '@tauri-apps/plugin-opener'
import { isMobile } from '../../composables/useEnv'
import {
  type BookDetail,
  type ChapterItem,
  useScriptBridge,
} from '../../composables/useScriptBridge'
import {
  type CachedChapter,
  useBookshelf,
} from '../../composables/useBookshelf'
import type { ReaderBookInfo } from '../reader/types'

const props = defineProps<{
  show: boolean
  bookUrl: string
  fileName: string
  sourceName: string
  /** 书源类型：novel（默认）或 comic 或 video */
  sourceType?: string
}>()

const emit = defineEmits<{
  (e: 'update:show', val: boolean): void
  (e: 'read-chapter', payload: { chapterUrl: string; chapterName: string; index: number; bookInfo: ReaderBookInfo; sourceType: string }): void
}>()

const message = useMessage()
const { runBookInfo, runChapterList } = useScriptBridge()
const { addToShelf, saveChapters, isOnShelf, ensureLoaded } = useBookshelf()

const loading = ref(false)
const error = ref('')
const detail = ref<BookDetail | null>(null)
const chapters = ref<ChapterItem[]>([])
const addingToShelf = ref(false)
const onShelf = ref(false)

/** 移动端全宽，桌面端固定宽度 */
const drawerWidth = computed(() => isMobile.value ? '100%' : 480)

/* ---- Escape / 安卓返回键关闭抽屉 ---- */
function onKeyDown(e: KeyboardEvent) {
  if (!props.show) return
  if (e.key === 'Escape' || e.key === 'BrowserBack') {
    e.preventDefault()
    emit('update:show', false)
  }
}
onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))

const fallbackCover = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="220" viewBox="0 0 160 220">' +
  '<rect width="160" height="220" rx="6" fill="%233a3a45"/>' +
  '<rect x="18" y="22" width="8" height="176" rx="2" fill="%23555568"/>' +
  '<rect x="26" y="22" width="116" height="176" rx="3" fill="%23464658" stroke="%23555568" stroke-width="0.5"/>' +
  '<rect x="132" y="28" width="5" height="164" rx="1.5" fill="%234e4e62"/>' +
  '<path d="M62 72 C62 72 72 68 84 72 L84 108 C72 104 62 108 62 108 Z" fill="%23606078"/>' +
  '<path d="M106 72 C106 72 96 68 84 72 L84 108 C96 104 106 108 106 108 Z" fill="%23555570"/>' +
  '<line x1="84" y1="72" x2="84" y2="108" stroke="%237a7a92" stroke-width="1"/>' +
  '<text x="84" y="140" text-anchor="middle" fill="%237a7a92" font-size="13" font-family="sans-serif">暂无封面</text>' +
  '</svg>'
)}`

watch(
  () => props.show,
  async (visible) => {
    if (!visible) return
    loading.value = true
    error.value = ''
    detail.value = null
    chapters.value = []
    onShelf.value = false
    try {
      await ensureLoaded()
      onShelf.value = isOnShelf(props.bookUrl, props.fileName)

      // 先获取书籍详情，拿到 tocUrl（目录专属 URL），再用它加载章节列表
      // bookInfo 返回的 tocUrl 可能与 bookUrl 不同（如番茄小说使用独立目录接口）
      const infoRaw = await runBookInfo(props.fileName, props.bookUrl)
      detail.value = infoRaw as BookDetail
      const tocUrl = detail.value.tocUrl ?? props.bookUrl
      const listRaw = await runChapterList(props.fileName, tocUrl)
      chapters.value = Array.isArray(listRaw) ? (listRaw as ChapterItem[]) : []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
      message.error(`加载书籍详情失败: ${error.value}`)
    } finally {
      loading.value = false
    }
  },
)

function onClickChapter(ch: ChapterItem, index: number) {
  const d = detail.value
  const bookInfo: ReaderBookInfo = {
    name: d?.name ?? '',
    author: d?.author ?? '',
    coverUrl: d?.coverUrl,
    intro: d?.intro,
    kind: d?.kind,
    bookUrl: props.bookUrl,
    sourceName: props.sourceName,
    fileName: props.fileName,
    lastChapter: d?.lastChapter,
    totalChapters: chapters.value.length,
  }
  emit('read-chapter', { chapterUrl: ch.url, chapterName: ch.name, index, bookInfo, sourceType: props.sourceType ?? 'novel' })
}

async function handleAddToShelf() {
  if (!detail.value || onShelf.value) return
  addingToShelf.value = true
  try {
    const d = detail.value
    const result = await addToShelf(
      {
        name: d.name,
        author: d.author,
        coverUrl: d.coverUrl,
        intro: d.intro,
        kind: d.kind,
        bookUrl: props.bookUrl,
        lastChapter: d.lastChapter,
        sourceType: props.sourceType ?? 'novel',
      },
      props.fileName,
      props.sourceName,
    )
    // 同时缓存章节目录
    if (chapters.value.length) {
      const cached: CachedChapter[] = chapters.value.map((ch, i) => ({
        index: i,
        name: ch.name,
        url: ch.url,
      }))
      await saveChapters(result.id, cached)
    }
    onShelf.value = true
    message.success('已加入书架')
  } catch (e: unknown) {
    message.error(`加入书架失败: ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    addingToShelf.value = false
  }
}
</script>

<template>
  <n-drawer
    :show="show"
    :width="drawerWidth"
    placement="right"
    @update:show="emit('update:show', $event)"
    :auto-focus="false"
  >
    <n-drawer-content :title="detail?.name ?? '书籍详情'" closable :body-content-style="{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '14px' }">
      <n-spin :show="loading" class="bd-spin-wrap">
        <!-- 错误 -->
        <n-alert v-if="error" type="error" :title="error" style="margin-bottom: 16px" />

        <!-- 详情头部 -->
        <div v-if="detail" class="bd-header">
          <img
            class="bd-header__cover"
            :src="detail.coverUrl || fallbackCover"
            :alt="detail.name"
            @error="($event.target as HTMLImageElement).src = fallbackCover"
          />
          <div class="bd-header__meta">
            <h2 class="bd-header__name">{{ detail.name }}</h2>
            <span class="bd-header__author">{{ detail.author }}</span>
            <div class="bd-header__tags">
              <n-tag v-if="detail.kind" size="tiny" :bordered="false">{{ detail.kind }}</n-tag>
              <n-tag v-if="detail.lastChapter" size="tiny" type="info" :bordered="false">
                {{ detail.lastChapter }}
              </n-tag>
            </div>
            <p v-if="detail.intro" class="bd-header__intro">{{ detail.intro }}</p>
            <a
              class="bd-header__url"
              :title="bookUrl"
              @click.prevent="openUrl(bookUrl)"
            >{{ bookUrl }}</a>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div v-if="detail" class="bd-actions">
          <div class="bd-actions__btn">
            <n-button
              type="primary"
              size="large"
              style="width: 100%"
              :disabled="!chapters.length"
              @click="chapters.length && onClickChapter(chapters[0], 0)"
            >
              开始阅读
            </n-button>
          </div>
          <div class="bd-actions__btn">
            <n-button
              size="large"
              style="width: 100%"
              :loading="addingToShelf"
              :disabled="onShelf"
              :type="onShelf ? 'default' : 'tertiary'"
              @click="handleAddToShelf"
            >
              {{ onShelf ? '已在书架' : '加入书架' }}
            </n-button>
          </div>
        </div>

        <!-- 章节列表 -->
        <div v-if="chapters.length" class="bd-chapters">
          <div class="bd-chapters__title">
            章节列表 ({{ chapters.length }})
          </div>
          <div class="bd-chapters__list">
            <div
              v-for="(ch, i) in chapters"
              :key="ch.url"
              class="bd-chapter-item"
              @click="onClickChapter(ch, i)"
            >
              <span class="bd-chapter-item__index">{{ i + 1 }}</span>
              <span class="bd-chapter-item__name">{{ ch.name }}</span>
            </div>
          </div>
        </div>

        <n-empty
          v-if="!loading && !error && !detail"
          description="暂无数据"
          style="padding: 48px 0"
        />
      </n-spin>
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped>
.bd-spin-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 200px;
}
/* 让 n-spin 内部容器也是 flex 列布局 */
:deep(.n-spin-content) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
}

.bd-header {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  flex-shrink: 0;
}
.bd-header__cover {
  width: 100px;
  height: 140px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  background: var(--color-surface);
}
.bd-header__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
/* 窄屏：封面+信息纵向排列 */
@media (max-width: 400px) {
  .bd-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .bd-header__cover {
    width: 120px;
    height: 168px;
  }
  .bd-header__tags {
    justify-content: center;
  }
}
.bd-header__name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.3;
}
.bd-header__author {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}
.bd-header__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.bd-header__intro {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 4px 0 0;
  max-height: 80px;
  overflow-y: auto;
  white-space: pre-wrap;
}
.bd-header__intro::-webkit-scrollbar { width: 4px; }
.bd-header__intro::-webkit-scrollbar-track { background: transparent; }
.bd-header__intro::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}
.bd-header__url {
  font-size: 0.75rem;
  color: var(--color-primary, #63a4ff);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-decoration: none;
}
.bd-header__url:hover {
  text-decoration: underline;
}

.bd-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  margin-bottom: 12px;
}
.bd-actions__btn {
  flex: 1;
  min-width: 0;
}

.bd-chapters {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
.bd-chapters__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.bd-chapters__list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.bd-chapters__list::-webkit-scrollbar { width: 4px; }
.bd-chapters__list::-webkit-scrollbar-track { background: transparent; }
.bd-chapters__list::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.bd-chapter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.bd-chapter-item:hover {
  background: var(--color-surface-hover);
}
.bd-chapter-item__index {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  min-width: 28px;
  text-align: center;
  flex-shrink: 0;
}
.bd-chapter-item__name {
  font-size: 0.8125rem;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
