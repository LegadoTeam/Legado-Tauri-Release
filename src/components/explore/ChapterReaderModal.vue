<script setup lang="ts">
/**
 * ChapterReaderModal — 阅读器主容器（瘦编排层）
 *
 * 负责章节内容加载、离线缓存、子组件编排。
 * UI 细节委派给 ReaderTopBar / ReaderBottomBar / ReaderTocPanel。
 */
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { useMessage } from 'naive-ui'
import type { ChapterItem } from '../../composables/useScriptBridge'
import { useScriptBridge } from '../../composables/useScriptBridge'
import { useBookshelf } from '../../composables/useBookshelf'
import { useReaderSettings } from '../reader/composables/useReaderSettings'
import ScrollMode from '../reader/modes/ScrollMode.vue'
import SlideMode from '../reader/modes/SlideMode.vue'
import CoverMode from '../reader/modes/CoverMode.vue'
import NoneMode from '../reader/modes/NoneMode.vue'
import SimulationMode from '../reader/modes/SimulationMode.vue'
import ComicMode from '../reader/modes/ComicMode.vue'
import ReaderTopBar from '../reader/ReaderTopBar.vue'
import ReaderBottomBar from '../reader/ReaderBottomBar.vue'
import ReaderTocPanel from '../reader/ReaderTocPanel.vue'
import type { ReaderBookInfo } from '../reader/types'

const props = defineProps<{
  show: boolean
  chapterUrl: string
  chapterName: string
  fileName: string
  chapters: ChapterItem[]
  currentIndex: number
  shelfBookId?: string
  bookInfo?: ReaderBookInfo
  /** 书源类型：novel（默认）或 comic */
  sourceType?: string
}>()

const emit = defineEmits<{
  (e: 'update:show', val: boolean): void
  (e: 'update:currentIndex', val: number): void
}>()

const message = useMessage()
const { runChapterContent } = useScriptBridge()
const { updateProgress, saveContent, getContent, getCachedIndices } = useBookshelf()
const { settings, getContentStyle } = useReaderSettings()

const loading = ref(false)
const content = ref('')
const error = ref('')

/* ---- 阅读状态追踪 ---- */
/** 已读过的章节索引集合（从书架进度初始化：0 ~ readChapterIndex） */
const readIndices = ref<Set<number>>(new Set())
/** 已下载缓存的章节索引集合（从磁盘扫描获取） */
const cachedIndices = ref<Set<number>>(new Set())

/** 弹窗打开时，从书架数据初始化阅读状态 */
async function loadShelfStatus() {
  if (!props.shelfBookId) return

  // 已缓存索引：扫描磁盘
  try {
    cachedIndices.value = await getCachedIndices(props.shelfBookId)
  } catch {
    cachedIndices.value = new Set()
  }

  // 已读索引：0 ~ readChapterIndex 均视为已阅读
  // bookInfo 上携带了 readChapterIndex（通过 totalChapters 等字段传递）
  // 实际上 shelfBook 有 readChapterIndex，但这里只能从 bookInfo 间接获取
  // 用 currentIndex（打开时的初始值）作为已读上限更准确
  const readUpTo = props.currentIndex >= 0 ? props.currentIndex : -1
  const set = new Set<number>()
  for (let i = 0; i <= readUpTo; i++) set.add(i)
  readIndices.value = set
}

/* ---- 预取缓存 ---- */
/** key: chapterUrl → value: 正文文本（内存缓存，随弹窗生命周期清除） */
const prefetchCache = new Map<string, string>()
/** 正在预取中的 url 集合，防止重复请求 */
const prefetching = new Set<string>()
/** 预取缓存最大条数，超出时淘汰最老的条目 */
const PREFETCH_MAX = 3

/** 将条目写入预取缓存，超出上限时淘汰最早写入的条目 */
function setPrefetch(url: string, text: string) {
  if (prefetchCache.size >= PREFETCH_MAX) {
    const firstKey = prefetchCache.keys().next().value
    if (firstKey !== undefined) prefetchCache.delete(firstKey)
  }
  prefetchCache.set(url, text)
}

/* ---- UI 状态 ---- */
const showMenu = ref(false)
const showToc = ref(false)
const settingsVisible = ref(false)
const bottomBarRef = ref<InstanceType<typeof ReaderBottomBar> | null>(null)

/** showMenu 关闭时重置 settingsVisible，防止下次打开菜单时顶部栏消失 */
watch(showMenu, (v) => {
  if (!v) {
    bottomBarRef.value?.closeSettings()
    settingsVisible.value = false
  }
})

/* ---- 章节导航 ---- */
const hasPrev = computed(() => props.currentIndex > 0)
const hasNext = computed(() => props.currentIndex < props.chapters.length - 1)

/** 导航方向：切换到上一章时为 backward，用于开始阅读上一章末页 */
const navDirection = ref<'forward' | 'backward'>('forward')

const currentChapterName = computed(() => {
  if (props.currentIndex >= 0 && props.currentIndex < props.chapters.length) {
    return props.chapters[props.currentIndex].name
  }
  return props.chapterName
})

function gotoPrev() {
  if (hasPrev.value) {
    navDirection.value = 'backward'
    emit('update:currentIndex', props.currentIndex - 1)
  }
}

function gotoNext() {
  if (hasNext.value) {
    navDirection.value = 'forward'
    emit('update:currentIndex', props.currentIndex + 1)
  }
}

function gotoChapter(idx: number) {
  if (idx !== props.currentIndex) {
    navDirection.value = idx < props.currentIndex ? 'backward' : 'forward'
    emit('update:currentIndex', idx)
  }
}

function close() {
  emit('update:show', false)
}

/* ---- 点击区域 ---- */
function onTap(zone: 'left' | 'center' | 'right') {
  if (zone === 'center') {
    if (showToc.value) {
      showToc.value = false
    } else {
      showMenu.value = !showMenu.value
    }
  } else if (zone === 'left') {
    gotoPrev()
  } else {
    gotoNext()
  }
}

function openToc() {
  showToc.value = true
  showMenu.value = false
}

/* ---- 模式组件引用 & 翻页控制 ---- */
const modeRef = ref<{ nextPage?: () => boolean; prevPage?: () => boolean } | null>(null)

/** 统一翻页：先尝试页内翻，失败则跨章节 */
function flipNext() {
  if (settings.flipMode === 'scroll') {
    // 滚动模式由滚动到底触发章节切换，快捷键直接切章
    gotoNext()
    return
  }
  const ok = modeRef.value?.nextPage?.()
  if (!ok) gotoNext()
}

function flipPrev() {
  if (settings.flipMode === 'scroll') {
    gotoPrev()
    return
  }
  const ok = modeRef.value?.prevPage?.()
  if (!ok) gotoPrev()
}

/* ---- 快捷键 ---- */
function onKeyDown(e: KeyboardEvent) {
  if (!props.show) return

  // Escape / 安卓返回键（BrowserBack）：按优先级逐层关闭
  if (e.key === 'Escape' || e.key === 'BrowserBack') {
    e.preventDefault()
    if (settingsVisible.value) {
      // 1. 优先关闭设置面板
      bottomBarRef.value?.closeSettings()
    } else if (showToc.value) {
      // 2. 关闭目录
      showToc.value = false
    } else if (showMenu.value) {
      // 3. 关闭菜单栏
      showMenu.value = false
    } else {
      // 4. 退出阅读器，回到书架
      close()
    }
    return
  }

  // 空格/回车：切换菜单（任何时候可用）
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    if (showToc.value) {
      showToc.value = false
    } else {
      showMenu.value = !showMenu.value
    }
    return
  }

  // 菜单/目录打开时不处理翻页快捷键
  if (showMenu.value || showToc.value) return

  switch (e.key) {
    case 'ArrowRight':
    case 'd':
    case 'D':
    case 'AudioVolumeDown':
      e.preventDefault()
      flipNext()
      break
    case 'ArrowLeft':
    case 'a':
    case 'A':
    case 'AudioVolumeUp':
      e.preventDefault()
      flipPrev()
      break
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))

/* ---- 内容加载 ---- */
async function loadContent(url: string, index: number) {
  loading.value = true
  content.value = ''
  error.value = ''
  try {
    let text: string | null = null

    // 1. 检查书架离线缓存
    if (props.shelfBookId) {
      try {
        text = await getContent(props.shelfBookId, index)
      } catch { /* fallback 到网络 */ }
    }

    // 2. 检查预取内存缓存
    if (!text && prefetchCache.has(url)) {
      text = prefetchCache.get(url)!
      prefetchCache.delete(url) // 消费后移除，避免下次误命中旧章节同 url
    }

    // 3. 网络拉取
    if (!text) {
      const raw = await runChapterContent(props.fileName, url)
      text = typeof raw === 'string' ? raw : String(raw ?? '')
      if (props.shelfBookId && text) {
        saveContent(props.shelfBookId, index, text).catch(() => {})
      }
    }

    content.value = text ?? ''

    if (props.shelfBookId) {
      updateProgress(props.shelfBookId, index, url).catch(() => {})
    }

    // 标记当前章节已阅读、已下载
    readIndices.value.add(index)
    cachedIndices.value.add(index)

    // 4. 加载成功后触发下一章预取
    prefetchNext(index)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
    message.error(`加载正文失败: ${error.value}`)
  } finally {
    loading.value = false
  }
}

/**
 * 后台预取下一章正文。
 * - 优先检查书架离线缓存，已有则跳过（无需预取）
 * - 已在预取中或已在内存缓存中则跳过（避免重复）
 */
async function prefetchNext(currentIndex: number) {
  const nextIdx = currentIndex + 1
  if (nextIdx >= props.chapters.length) return

  const nextChapter = props.chapters[nextIdx]
  if (!nextChapter) return

  const url = nextChapter.url
  if (prefetchCache.has(url) || prefetching.has(url)) return

  // 若书架缓存已有，跳过预取
  if (props.shelfBookId) {
    try {
      const cached = await getContent(props.shelfBookId, nextIdx)
      if (cached) return
    } catch { /* 忽略，继续预取 */ }
  }

  prefetching.add(url)
  try {
    const raw = await runChapterContent(props.fileName, url)
    const text = typeof raw === 'string' ? raw : String(raw ?? '')
    if (text) {
      setPrefetch(url, text)
      // 同时写入书架缓存并标记为已下载
      if (props.shelfBookId) {
        saveContent(props.shelfBookId, nextIdx, text).catch(() => {})
      }
      cachedIndices.value.add(nextIdx)
    }
  } catch {
    // 预取失败静默处理，不影响当前章节阅读
  } finally {
    prefetching.delete(url)
  }
}

/**
 * 核心 watcher：监听 currentIndex 变化，自动从 chapters 中
 * 取 URL 并加载。这使组件自洽，不再依赖父组件同步 chapterUrl。
 */
watch(
  () => [props.show, props.currentIndex] as const,
  ([visible, idx]) => {
    if (!visible) return
    const ch = props.chapters[idx]
    if (ch) {
      loadContent(ch.url, idx)
    }
  },
  { immediate: true },
)

/* 打开时重置 UI 状态并加载书架状态；关闭时清空缓存 */
watch(
  () => props.show,
  (v) => {
    if (v) {
      showMenu.value = false
      showToc.value = false
      loadShelfStatus()
    } else {
      prefetchCache.clear()
      prefetching.clear()
      readIndices.value = new Set()
      cachedIndices.value = new Set()
    }
  },
)
</script>

<template>
  <n-modal
    :show="show"
    @update:show="emit('update:show', $event)"
    :mask-closable="false"
    :auto-focus="false"
    :trap-focus="false"
    transform-origin="center"
  >
    <div class="reader-modal" :style="getContentStyle()">
      <!-- 正文区（全屏） -->
      <div class="reader-modal__body">
        <n-spin v-if="loading" :show="true" class="reader-modal__spin" />
        <n-alert v-else-if="error" type="error" :title="error" style="margin:24px" />

        <!-- 漫画模式 -->
        <ComicMode
          v-else-if="sourceType === 'comic'"
          :content="content"
          :file-name="fileName"
          :chapter-url="chapters[currentIndex]?.url ?? chapterUrl"
          :has-prev="hasPrev"
          :has-next="hasNext"
          @tap="onTap"
          @prev-chapter="gotoPrev"
          @next-chapter="gotoNext"
        />

        <!-- 覆盖模式 -->
        <CoverMode
          v-else-if="settings.flipMode === 'cover'"
          ref="modeRef"
          :content="content"
          :typography="settings.typography"
          :padding="settings.padding"
          :start-from-end="navDirection === 'backward'"
          @tap="onTap"
          @prev-chapter="gotoPrev"
          @next-chapter="gotoNext"
        />

        <!-- 仿真翻页模式 -->
        <SimulationMode
          v-else-if="settings.flipMode === 'simulation'"
          ref="modeRef"
          :content="content"
          :typography="settings.typography"
          :padding="settings.padding"
          :start-from-end="navDirection === 'backward'"
          @tap="onTap"
          @prev-chapter="gotoPrev"
          @next-chapter="gotoNext"
        />

        <!-- 无动画模式（电子墨水屏） -->
        <NoneMode
          v-else-if="settings.flipMode === 'none'"
          ref="modeRef"
          :content="content"
          :typography="settings.typography"
          :padding="settings.padding"
          :start-from-end="navDirection === 'backward'"
          @tap="onTap"
          @prev-chapter="gotoPrev"
          @next-chapter="gotoNext"
        />

        <!-- 平移模式 -->
        <SlideMode
          v-else-if="settings.flipMode === 'slide'"
          ref="modeRef"
          :content="content"
          :typography="settings.typography"
          :padding="settings.padding"
          :start-from-end="navDirection === 'backward'"
          @tap="onTap"
          @prev-chapter="gotoPrev"
          @next-chapter="gotoNext"
        />

        <!-- 滚动模式（默认） -->
        <ScrollMode
          v-else
          :content="content"
          :paragraph-spacing="settings.typography.paragraphSpacing"
          :text-indent="settings.typography.textIndent"
          :has-prev="hasPrev"
          :has-next="hasNext"
          @tap="onTap"
          @prev-chapter="gotoPrev"
          @next-chapter="gotoNext"
        />
      </div>

      <!-- 遮罩 -->
      <Transition name="reader-fade">
        <div v-if="showMenu" class="reader-modal__overlay" @click="showMenu = false" />
      </Transition>

      <!-- 顶部栏（设置面板展开时隐藏） -->
      <Transition name="reader-slide-top">
        <ReaderTopBar
          v-if="showMenu && !settingsVisible"
          :chapter-name="currentChapterName"
          :current-index="currentIndex"
          :total-chapters="chapters.length"
          :chapter-url="chapters[currentIndex]?.url"
          @close="close"
        />
      </Transition>

      <!-- 底部栏 -->
      <Transition name="reader-slide-bottom">
        <ReaderBottomBar
          v-if="showMenu"
          ref="bottomBarRef"
          :chapters="chapters"
          :current-index="currentIndex"
          :has-prev="hasPrev"
          :has-next="hasNext"
          @prev="gotoPrev"
          @next="gotoNext"
          @goto="gotoChapter"
          @open-toc="openToc"
          @settings-visible="settingsVisible = $event"
        />
      </Transition>

      <!-- 目录面板 -->
      <ReaderTocPanel
        v-model:show="showToc"
        :chapters="chapters"
        :current-index="currentIndex"
        :book-info="bookInfo"
        :read-indices="readIndices"
        :cached-indices="cachedIndices"
        @select="gotoChapter"
      />
    </div>
  </n-modal>
</template>

<style scoped>
.reader-modal {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: var(--reader-bg-image, none), var(--reader-bg-color, var(--color-surface));
  color: var(--reader-text-color, var(--color-text-primary));
  /* 整体字体渲染优化：覆盖 :root 的 font-synthesis:none，允许合成粗/斜体 */
  font-synthesis: weight style;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  /* 禁用双击缩放，确保安卓上单击稳定触发 */
  touch-action: manipulation;
  /* 安卓状态栏安全区 */
  padding-top: env(safe-area-inset-top, 0px);
}

.reader-modal__body {
  width: 100%;
  height: 100%;
}

.reader-modal__spin {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reader-modal__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 10;
}

/* 过渡动画 */
.reader-fade-enter-active,
.reader-fade-leave-active {
  transition: opacity 0.25s ease;
}
.reader-fade-enter-from,
.reader-fade-leave-to {
  opacity: 0;
}

.reader-slide-top-enter-active,
.reader-slide-top-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.reader-slide-top-enter-from,
.reader-slide-top-leave-to {
  transform: translateY(-100%);
}

.reader-slide-bottom-enter-active,
.reader-slide-bottom-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.reader-slide-bottom-enter-from,
.reader-slide-bottom-leave-to {
  transform: translateY(100%);
}
</style>
