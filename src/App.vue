<script setup lang="ts">
import { ref, computed, defineAsyncComponent, watch } from 'vue'
import { darkTheme } from 'naive-ui'
import { isMobile, setLayoutMode } from './composables/useEnv'
import { useAppConfig } from './composables/useAppConfig'
import { activeView } from './composables/useNavigation'
import TitleBar from './components/layout/TitleBar.vue'
import SideBar, { type NavItem } from './components/layout/SideBar.vue'
import TaskBar from './components/layout/TaskBar.vue'
import BottomNav from './components/layout/BottomNav.vue'
import MobileDebugFloat from './components/layout/MobileDebugFloat.vue'
import MainContent from './components/layout/MainContent.vue'
import ScriptDialog from './components/ScriptDialog.vue'

// ── 独立窗口模式检测 ──────────────────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search)
const windowView = urlParams.get('view')

const LogView = windowView === 'logs'
  ? defineAsyncComponent(() => import('./views/LogView.vue'))
  : null

// ── 主窗口视图 ───────────────────────────────────────────────────────────

const BookshelfView  = defineAsyncComponent(() => import('./views/BookshelfView.vue'))
const ExploreView    = defineAsyncComponent(() => import('./views/ExploreView.vue'))
const SearchView     = defineAsyncComponent(() => import('./views/SearchView.vue'))
const BookSourceView = defineAsyncComponent(() => import('./views/BookSourceView.vue'))
const ExtensionsView = defineAsyncComponent(() => import('./views/ExtensionsView.vue'))
const SettingsView   = defineAsyncComponent(() => import('./views/SettingsView.vue'))

const viewMap: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  bookshelf:  BookshelfView,
  explore:    ExploreView,
  search:     SearchView,
  booksource: BookSourceView,
  extensions: ExtensionsView,
  settings:   SettingsView,
}

const sidebarCollapsed = ref(false)

/** 桌面端导航项 */
const desktopNavItems: NavItem[] = [
  { id: 'bookshelf',  icon: 'bookshelf',  label: '书架' },
  { id: 'explore',    icon: 'explore',    label: '发现' },
  { id: 'search',     icon: 'search',     label: '搜索' },
  { id: 'booksource', icon: 'booksource', label: '书源管理' },
  { id: 'extensions', icon: 'extensions', label: '插件管理' },
  { id: 'settings',   icon: 'settings',   label: '设置' },
]

/** 移动端底部导航项（精简六项） */
const mobileNavItems: NavItem[] = [
  { id: 'bookshelf',  icon: 'bookshelf',  label: '书架' },
  { id: 'explore',    icon: 'explore',    label: '发现' },
  { id: 'search',     icon: 'search',     label: '搜索' },
  { id: 'booksource', icon: 'booksource', label: '书源' },
  { id: 'extensions', icon: 'extensions', label: '扩展' },
  { id: 'settings',   icon: 'settings',   label: '设置' },
]

const navItems = computed(() => isMobile.value ? mobileNavItems : desktopNavItems)
const activeNavLabel = computed(() => navItems.value.find(n => n.id === activeView.value)?.label ?? '')

const currentView = computed(() => viewMap[activeView.value] ?? BookshelfView)

// ── 布局模式同步 ─────────────────────────────────────────────────────────
const { config: appConfig, ensureLoaded: ensureAppConfig } = useAppConfig()

// 启动时和配置变更时同步布局模式
ensureAppConfig().then(() => setLayoutMode(appConfig.value.ui_layout_mode))
watch(() => appConfig.value.ui_layout_mode, (mode) => setLayoutMode(mode))

function onNavSelect(id: string) {
  activeView.value = id
}
</script>

<template>
  <n-config-provider :theme="darkTheme">
    <n-message-provider>
      <n-dialog-provider>
        <!-- 独立窗口模式：日志查看器 -->
        <template v-if="LogView">
          <Suspense>
            <component :is="LogView" />
            <template #fallback>
              <div class="view-loading">加载中…</div>
            </template>
          </Suspense>
        </template>

        <!-- 主窗口布局 -->
        <template v-else>
          <div class="app-layout" :class="{ 'app-layout--mobile': isMobile }">
            <TitleBar :title="isMobile ? activeNavLabel : 'Legado'" />
            <SideBar
              v-if="!isMobile"
              :items="navItems"
              :active-id="activeView"
              v-model:collapsed="sidebarCollapsed"
              @select="onNavSelect"
            />
            <MainContent>
              <Suspense>
                <component :is="currentView" />
                <template #fallback>
                  <div class="view-loading">加载中…</div>
                </template>
              </Suspense>
            </MainContent>
            <TaskBar v-if="!isMobile" :status-text="activeNavLabel" />
            <BottomNav
              v-if="isMobile"
              :items="navItems"
              :active-id="activeView"
              @select="onNavSelect"
            />
          </div>
          <MobileDebugFloat v-if="isMobile && appConfig.ui_show_debug_float" />
          <!-- 全局脚本交互弹窗：响应 Boa 引擎 legado.ui.emit / script_dialog_open -->
          <ScriptDialog />
        </template>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style scoped>
.app-layout {
  display: grid;
  grid-template-areas:
    "title   title"
    "sidebar main"
    "taskbar taskbar";
  grid-template-rows: var(--titlebar-h) 1fr var(--taskbar-h);
  grid-template-columns: var(--sidebar-w) 1fr;
  height: 100vh;
  transition: grid-template-columns var(--transition-base);
}

/* 菜单栏收起时同步收缩 grid 列宽 */
.app-layout:has(.side-bar--collapsed) {
  grid-template-columns: var(--sidebar-collapsed-w) 1fr;
}

/* 移动端：单列布局，顶栏 + 内容 + 底部导航 */
.app-layout--mobile {
  grid-template-areas:
    "title"
    "main"
    "bottomnav";
  grid-template-rows: var(--titlebar-h) 1fr var(--bottomnav-h);
  grid-template-columns: 1fr;
}

.placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.view-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}
</style>