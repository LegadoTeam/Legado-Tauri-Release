/**
 * useReaderSettings — 阅读器设置状态管理
 *
 * 管理排版、主题、翻页模式等所有可自定义选项。
 * 设置自动持久化到 localStorage，刷新后恢复。
 */
import { reactive, watch, toRefs } from 'vue'
import {
  type ReaderSettings,
  type ReaderTypography,
  type ReaderTheme,
  type FlipMode,
  DEFAULT_SETTINGS,
} from '../types'

const STORAGE_KEY = 'legado-reader-settings'

function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ReaderSettings>
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        typography: { ...DEFAULT_SETTINGS.typography, ...(parsed.typography ?? {}) },
        theme: { ...DEFAULT_SETTINGS.theme, ...(parsed.theme ?? {}) },
      }
    }
  } catch {
    // 损坏数据则回退默认
  }
  return { ...DEFAULT_SETTINGS, typography: { ...DEFAULT_SETTINGS.typography }, theme: { ...DEFAULT_SETTINGS.theme } }
}

function saveSettings(s: ReaderSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // storage 满则静默
  }
}

// 单例状态，多个组件共享同一份设置
let _settings: ReturnType<typeof reactive<ReaderSettings>> | null = null

export function useReaderSettings() {
  if (!_settings) {
    _settings = reactive<ReaderSettings>(loadSettings())
    watch(() => ({ ..._settings! }), (val) => saveSettings(val as ReaderSettings), { deep: true })
  }
  const settings = _settings

  /** 更新排版属性（局部） */
  function updateTypography(patch: Partial<ReaderTypography>) {
    Object.assign(settings.typography, patch)
  }

  /** 切换主题 */
  function setTheme(theme: ReaderTheme) {
    Object.assign(settings.theme, theme)
  }

  /** 切换翻页模式 */
  function setFlipMode(mode: FlipMode) {
    settings.flipMode = mode
  }

  /** 重置为默认设置 */
  function resetSettings() {
    const defaults = {
      ...DEFAULT_SETTINGS,
      typography: { ...DEFAULT_SETTINGS.typography },
      theme: { ...DEFAULT_SETTINGS.theme },
    }
    Object.assign(settings, defaults)
  }

  /** 生成内容区 CSS 变量对象，直接绑定到 :style */
  function getContentStyle(): Record<string, string> {
    const t = settings.typography
    return {
      '--reader-font-family': t.fontFamily,
      '--reader-font-size': `${t.fontSize}px`,
      '--reader-line-height': `${t.lineHeight}`,
      '--reader-letter-spacing': `${t.letterSpacing}px`,
      '--reader-word-spacing': `${t.wordSpacing}px`,
      '--reader-paragraph-spacing': `${t.paragraphSpacing}px`,
      '--reader-text-indent': `${t.textIndent}em`,
      '--reader-font-weight': `${t.fontWeight}`,
      '--reader-font-style': t.fontStyle,
      '--reader-text-align': t.textAlign,
      '--reader-text-decoration': t.textDecoration,
      '--reader-text-transform': t.textTransform,
      '--reader-font-variant': t.fontVariant,
      '--reader-writing-mode': t.writingMode,
      '--reader-text-stroke-width': `${t.textStrokeWidth}px`,
      '--reader-text-stroke-color': t.textStrokeColor,
      '--reader-text-shadow': t.textShadow,
      '--reader-bg-color': settings.theme.backgroundColor,
      '--reader-text-color': settings.theme.textColor,
      '--reader-selection-color': settings.theme.selectionColor,
      '--reader-padding': `${settings.padding}px`,
      '--reader-brightness': `${settings.brightness}%`,
      '--reader-bg-image': settings.backgroundImage || 'none',
    }
  }

  return {
    settings,
    ...toRefs(settings),
    updateTypography,
    setTheme,
    setFlipMode,
    resetSettings,
    getContentStyle,
  }
}
