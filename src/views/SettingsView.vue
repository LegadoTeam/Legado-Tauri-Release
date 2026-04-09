<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { isTauri, isMobile, envLabel, platform } from '@/composables/useEnv'
import { useAppConfig, BUILTIN_USER_AGENT } from '@/composables/useAppConfig'

const message = useMessage()
const { config, savingKey, loadConfig, setConfig, resetConfig } = useAppConfig()

// ── UA 预设库 ────────────────────────────────────────────────────────────
interface UaPreset { label: string; value: string }
interface UaGroup  { label: string; presets: UaPreset[] }

const UA_GROUPS: UaGroup[] = [
  {
    label: 'Windows',
    presets: [
      { label: 'Chrome 146 (Win)', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' },
      { label: 'Chrome 145 (Win)', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' },
      { label: 'Chrome 144 (Win)', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36' },
      { label: 'Chrome 120 (Win)', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      { label: 'Edge 146 (Win)',   value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0' },
      { label: 'Firefox 149 (Win)', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0' },
      { label: 'Firefox 135 (Win)', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0' },
    ],
  },
  {
    label: 'macOS',
    presets: [
      { label: 'Chrome 147 (Mac)', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36' },
      { label: 'Chrome 146 (Mac)', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' },
      { label: 'Chrome 145 (Mac)', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' },
      { label: 'Chrome 120 (Mac)', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      { label: 'Safari 26.4 (Mac)', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Safari/605.1.15' },
      { label: 'Safari 26.3 (Mac)', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15' },
      { label: 'Firefox 149 (Mac)', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:149.0) Gecko/20100101 Firefox/149.0' },
    ],
  },
  {
    label: 'Android',
    presets: [
      { label: 'Chrome 146 Mobile (Android)', value: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36' },
      { label: 'Chrome 145 Mobile (Android)', value: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36' },
      { label: 'Chrome 144 Mobile (Android)', value: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36' },
      { label: 'Chrome 130 Mobile (Android)', value: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' },
      { label: 'Samsung Browser 29 (Android)', value: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/29.0 Chrome/136.0.0.0 Mobile Safari/537.36' },
    ],
  },
  {
    label: 'iOS',
    presets: [
      { label: 'Safari 26.4 (iPhone)', value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1' },
      { label: 'Safari 26.3 (iPhone)', value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1' },
      { label: 'Safari 18.6 (iPhone)', value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1' },
      { label: 'Chrome 146 (iPhone)', value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1' },
    ],
  },
  {
    label: 'Linux',
    presets: [
      { label: 'Chrome 146 (Linux)', value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' },
      { label: 'Chrome 145 (Linux)', value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' },
      { label: 'Firefox 149 (Linux)', value: 'Mozilla/5.0 (X11; Linux x86_64; rv:149.0) Gecko/20100101 Firefox/149.0' },
    ],
  },
]

// 将分组转为 n-select 的 options 格式
const uaSelectOptions = UA_GROUPS.map(g => ({
  type: 'group' as const,
  label: g.label,
  key: g.label,
  children: g.presets.map(p => ({ label: p.label, value: p.value })),
}))

const selectedPresetUa = ref<string | null>(null)

function applyPreset(val: string | null) {
  if (!val) return
  uaInput.value = val
  saveUa()
  selectedPresetUa.value = null   // 选完即复位，避免 select 锁定
}

const uaInput = ref('')

async function handleLoadConfig() {
  if (!isTauri) return
  try {
    await loadConfig()
    uaInput.value = config.value.http_user_agent
  } catch (e) {
    console.error('加载配置失败', e)
  }
}

async function handleSetConfig(key: string, value: string) {
  if (!isTauri) return
  try {
    await setConfig(key, value)
    uaInput.value = config.value.http_user_agent
    message.success('已保存')
  } catch (e: unknown) {
    message.error(`保存失败: ${e}`)
  }
}

async function handleResetConfig(key: string) {
  if (!isTauri) return
  try {
    await resetConfig(key)
    uaInput.value = config.value.http_user_agent
    message.success('已重置为默认值')
  } catch (e: unknown) {
    message.error(`重置失败: ${e}`)
  }
}

function saveUa() {
  handleSetConfig('http_user_agent', uaInput.value.trim() || BUILTIN_USER_AGENT)
}

// ── 调试设置（直接读写 config.ui_show_debug_float，通过 handleSetConfig 持久化） ──

// ── 日志窗口（桌面端复用 TaskBar 的逻辑） ────────────────────────────────
async function openLogWindow() {
  if (isMobile.value) return
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const existing = await WebviewWindow.getByLabel('log-viewer')
    if (existing) {
      await existing.setFocus()
      return
    }
    new WebviewWindow('log-viewer', {
      url: '/?view=logs',
      title: '实时日志',
      width: 900,
      height: 600,
    })
  } catch {
    // 非 Tauri 环境忽略
  }
}

onMounted(handleLoadConfig)
</script>

<template>
  <div class="settings-view">
    <div class="sv-header">
      <h1 class="sv-header__title">设置</h1>
      <p class="sv-header__sub">应用配置与环境信息</p>
    </div>

    <div class="sv-content">
      <!-- 环境信息 -->
      <n-card title="环境信息" size="small" class="sv-card">
        <div class="sv-info-grid">
          <div class="sv-info-item">
            <span class="sv-info-label">运行环境</span>
            <n-tag size="small" :bordered="false">{{ envLabel }}</n-tag>
          </div>
          <div class="sv-info-item">
            <span class="sv-info-label">操作系统</span>
            <n-tag size="small" :bordered="false">{{ platform || '未知' }}</n-tag>
          </div>
          <div class="sv-info-item">
            <span class="sv-info-label">Tauri 原生壳</span>
            <n-tag size="small" :type="isTauri ? 'success' : 'default'" :bordered="false">
              {{ isTauri ? '是' : '否' }}
            </n-tag>
          </div>
          <div class="sv-info-item">
            <span class="sv-info-label">移动端</span>
            <n-tag size="small" :type="isMobile ? 'warning' : 'default'" :bordered="false">
              {{ isMobile ? '是' : '否' }}
            </n-tag>
          </div>
        </div>
      </n-card>

      <!-- 调试设置 -->
      <n-card title="调试" size="small" class="sv-card">
        <div class="sv-setting-row" v-if="isMobile">
          <div class="sv-setting-info">
            <span class="sv-setting-label">调试浮窗</span>
            <span class="sv-setting-desc">在 App 内显示浮动调试日志按钮</span>
          </div>
          <n-switch
            :value="config.ui_show_debug_float"
            size="small"
            :loading="savingKey === 'ui_show_debug_float'"
            @update:value="(v: boolean) => handleSetConfig('ui_show_debug_float', String(v))"
          />
        </div>
        <div class="sv-setting-row" v-if="isTauri && !isMobile">
          <div class="sv-setting-info">
            <span class="sv-setting-label">实时日志窗口</span>
            <span class="sv-setting-desc">打开独立窗口查看脚本运行日志</span>
          </div>
          <n-button size="small" @click="openLogWindow">打开</n-button>
        </div>
      </n-card>

      <!-- 通用设置 -->
      <n-card title="通用" size="small" class="sv-card">
        <div class="sv-setting-row">
          <div class="sv-setting-info">
            <span class="sv-setting-label">主题</span>
            <span class="sv-setting-desc">暗色主题（跟随系统）</span>
          </div>
          <n-tag size="small" :bordered="false">暗色</n-tag>
        </div>
        <div class="sv-setting-row" style="border-top: 1px solid var(--color-border); margin-top: 8px; padding-top: 8px;">
          <div class="sv-setting-info">
            <span class="sv-setting-label">布局模式</span>
            <span class="sv-setting-desc">切换手机 / 电脑界面；自动模式根据设备自动判断</span>
          </div>
          <n-radio-group
            :value="config.ui_layout_mode"
            size="small"
            :loading="savingKey === 'ui_layout_mode'"
            @update:value="(v: string) => handleSetConfig('ui_layout_mode', v)"
          >
            <n-radio-button value="auto">自动</n-radio-button>
            <n-radio-button value="mobile">手机</n-radio-button>
            <n-radio-button value="desktop">电脑</n-radio-button>
          </n-radio-group>
        </div>
      </n-card>

      <!-- HTTP 请求设置 -->
      <n-card title="HTTP 请求" size="small" class="sv-card sv-card--wide" v-if="isTauri">
        <!-- User-Agent -->
        <div class="sv-setting-block">
          <div class="sv-setting-info">
            <span class="sv-setting-label">User-Agent</span>
            <span class="sv-setting-desc">书源脚本未显式设置 UA 时使用此值</span>
          </div>

          <!-- 预设选择器 -->
          <n-select
            v-model:value="selectedPresetUa"
            :options="uaSelectOptions"
            placeholder="从预设快速选择..."
            size="small"
            clearable
            @update:value="applyPreset"
          />

          <!-- 自定义输入 -->
          <div class="sv-ua-row">
            <n-input
              v-model:value="uaInput"
              size="small"
              placeholder="自定义 User-Agent，留空使用内置默认"
              class="sv-ua-input"
              @keydown.enter="saveUa"
            />
            <n-button
              size="small"
              type="primary"
              :loading="savingKey === 'http_user_agent'"
              @click="saveUa"
            >保存</n-button>
            <n-button
              size="small"
              :loading="savingKey === 'http_user_agent'"
              @click="handleResetConfig('http_user_agent')"
            >重置</n-button>
          </div>

          <!-- 当前生效值 -->
          <n-ellipsis class="sv-setting-desc sv-ua-current" :tooltip="{ placement: 'bottom' }">
            当前：{{ config.http_user_agent }}
          </n-ellipsis>
        </div>

        <!-- 连接超时 -->
        <div class="sv-setting-row" style="border-top: 1px solid var(--color-border); margin-top: 12px; padding-top: 12px;">
          <div class="sv-setting-info">
            <span class="sv-setting-label">连接超时</span>
            <span class="sv-setting-desc">HTTP 连接超时时间（秒）</span>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <n-input-number
              :value="config.http_connect_timeout_secs"
              size="small"
              :min="1"
              :max="300"
              style="width:90px;"
              @update:value="(v: number | null) => v != null && handleSetConfig('http_connect_timeout_secs', String(v))"
            />
            <span class="sv-setting-desc">秒</span>
          </div>
        </div>
      </n-card>

      <!-- 漫画设置 -->
      <n-card title="漫画" size="small" class="sv-card" v-if="isTauri">
        <div class="sv-setting-row">
          <div class="sv-setting-info">
            <span class="sv-setting-label">图片缓存</span>
            <span class="sv-setting-desc">启用后漫画图片经 Rust 后端下载缓存到本地，支持离线查看和预加载下一章；关闭则由浏览器直接加载图片 URL</span>
          </div>
          <n-switch
            :value="config.comic_cache_enabled"
            size="small"
            :loading="savingKey === 'comic_cache_enabled'"
            @update:value="(v: boolean) => handleSetConfig('comic_cache_enabled', String(v))"
          />
        </div>
      </n-card>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
}

.sv-header {
  flex-shrink: 0;
  padding: 24px 24px 12px;
}
.sv-header__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 2px;
}
.sv-header__sub {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0;
}

.sv-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sv-content::-webkit-scrollbar { width: 5px; }
.sv-content::-webkit-scrollbar-track { background: transparent; }
.sv-content::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.sv-card {
  max-width: 600px;
}
.sv-card--wide {
  max-width: 800px;
}

.sv-setting-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sv-ua-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.sv-ua-input {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
}
.sv-ua-current {
  font-size: 0.72rem;
  word-break: break-all;
}

.sv-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.sv-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sv-info-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.sv-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
}
.sv-setting-row + .sv-setting-row {
  border-top: 1px solid var(--color-border);
}
.sv-setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.sv-setting-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}
.sv-setting-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* ── 移动端适配 ─────────────────────────── */
@media (pointer: coarse), (max-width: 640px) {
  .sv-header { padding: 16px 16px 8px; }
  .sv-content { padding: 0 16px 16px; }
  .sv-card { max-width: 100%; }
}
</style>
