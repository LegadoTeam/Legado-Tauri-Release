# 书源系统详细文档

> 仅在开发书源相关功能时按需阅读。

## 书源元数据（`BookSourceMeta`）

JS 文件头部注释结构（Rust `parse_meta` 从前 60 行解析）：

```js
// @name        书源名称
// @version     1.0.0
// @author      作者名
// @url         https://主镜像.com      ← 可多行，每行一个 URL，第一个为主 URL
// @url         https://备用镜像.com
// @group       分类
// @logo        https://example.com/favicon.ico
// @enabled     true
// @description 简介第一行              ← 可多行，自动以 \n 拼接
// @description 简介第二行
```

| 字段          | 类型       | 说明                      |
| ------------- | ---------- | ------------------------- |
| `name`        | `string`   | 书源名称                  |
| `url`         | `string`   | 主 URL（`urls[0]`）       |
| `urls`        | `string[]` | 所有镜像 URL              |
| `author`      | `string?`  | 作者                      |
| `logo`        | `string?`  | favicon URL，卡片左侧显示 |
| `group`       | `string?`  | 分组                      |
| `description` | `string?`  | 多行描述                  |
| `enabled`     | `boolean`  | 启用状态                  |
| `fileName`    | `string`   | 磁盘文件名（`.js`）       |

## 书源 Tauri 命令

| 命令                        | 说明                                         |
| --------------------------- | -------------------------------------------- |
| `booksource_get_dir`        | 返回书源目录绝对路径                         |
| `booksource_list`           | 列出所有 `.js` 书源，返回 `BookSourceMeta[]` |
| `booksource_read`           | 读取单个书源完整内容                         |
| `booksource_save`           | 保存（新建/覆盖）书源文件                    |
| `booksource_delete`         | 删除书源文件                                 |
| `booksource_toggle`         | 切换 `@enabled` 标记                         |
| `booksource_open_in_vscode` | 用 VS Code CLI 打开文件                      |
| `booksource_eval`           | Boa 引擎装载脚本，可选执行入口代码           |
| `js_eval`                   | 独立 Boa eval（调试用）                      |

## Boa 宿主 API（书源脚本可用）

> **完整 API 参考请见 [engine-builtins.md](engine-builtins.md)**

| API                                              | 说明                                                    |
| ------------------------------------------------ | ------------------------------------------------------- |
| `legado.log(msg)`                                | 打印日志（stderr & `script:log` 事件）                  |
| `legado.toast(msg)`                              | 向前端发送提示通知                                      |
| `legado.http.get(url, headers?)`                 | 同步阻塞 HTTP GET，`headers` 可选 `{ key: value }` 对象 |
| `legado.http.post(url, body, headers?)`          | 同步阻塞 HTTP POST，`headers` 可选                      |
新增了提交二进制的接口

| `legado.base64Encode(str)` / `base64Decode(str)` | Base64 编解码（亦可用全局 `btoa`/`atob`）               |
| `legado.urlEncode(str)` / `urlDecode(str)`       | URL 编解码                                              |
| `legado.htmlEncode(str)` / `htmlDecode(str)`     | HTML 实体编解码                                         |
| `legado.md5(str)`                                | MD5 哈希（32 位 hex）                                   |
| `legado.sha1(str)` / `sha256(str)`               | SHA 哈希                                                |
| `legado.hmacSha256(data, key)`                   | HMAC-SHA256                                             |
| `legado.aesEncrypt(data, key, iv?, mode?)`       | AES 加密（CBC/ECB）                                     |
| `legado.aesDecrypt(data, key, iv?, mode?)`       | AES 解密                                                |
| `legado.desEncrypt(data, key, iv?)`              | DES-CBC 加密                                            |
| `legado.desDecrypt(data, key, iv?)`              | DES-CBC 解密                                            |
| `legado.config.read(scope, key)`                 | 读取持久化配置值                                        |
| `legado.config.write(scope, key, value)`         | 写入持久化配置值                                        |
| `legado.config.readBytes(scope, key)`            | 读取字节数组配置                                        |
| `legado.config.writeBytes(scope, key, bytes)`    | 写入字节数组配置                                        |
| `legado.ui.emit(event, data)`                    | 向前端推送 `script:ui` 事件                             |
| `console.log/info/warn/error/debug(...)`         | 输出到 stderr（与 `legado.log` 类似）                   |
| **DOM 解析 & CSS 选择器**                        | **`legado.dom.*`** — 基于 scraper（html5ever）          |
| `legado.dom.parse(html)`                         | 解析 HTML → 文档句柄                                    |
| `legado.dom.free(handle)`                        | 释放文档（可选，线程结束自动清理）                      |
| `legado.dom.select(handle, selector)`            | CSS 选择第一个匹配 → 元素句柄 \| `null`                 |
| `legado.dom.selectAll(handle, selector)`         | CSS 选择全部匹配 → 元素句柄数组                         |
| `legado.dom.text(handle)`                        | 递归提取全部文本                                        |
| `legado.dom.ownText(handle)`                     | 仅直接子文本节点（不含嵌套元素）                        |
| `legado.dom.html(handle)`                        | innerHTML                                               |
| `legado.dom.outerHtml(handle)`                   | outerHTML                                               |
| `legado.dom.attr(handle, name)`                  | 读取属性值 \| `null`                                    |
| `legado.dom.tagName(handle)`                     | 标签名                                                  |
| `legado.dom.selectByText(handle, text)`          | 查找文本包含 `text` 的第一个元素                        |
| `legado.dom.remove(handle, selector)`            | 移除匹配元素，返回清理后 HTML                           |
| `legado.dom.selectText(handle, sel)`             | `select` + `text` 一步完成                              |
| `legado.dom.selectAttr(handle, sel, attr)`       | `select` + `attr` 一步完成                              |
| `legado.dom.selectAllTexts(handle, sel)`         | 全部匹配元素的文本数组                                  |
| `legado.dom.selectAllAttrs(handle, sel, attr)`   | 全部匹配元素的属性值数组                                |
| `legado.dom.selectAllOuterHtmls(handle, sel)`    | 全部匹配元素的 outerHTML 数组                           |

> **HTTP 请求说明**：所有请求默认携带 Chrome UA（`Mozilla/5.0 ... Chrome/120.0.0.0`）。
> 可通过 `headers` 参数覆盖 `User-Agent` 或添加其他自定义 header：
>
> ```js
> legado.http.get(url, { Referer: "https://example.com", "User-Agent": "Custom/1.0" });
> ```

## DOM 解析 & CSS 选择器（`legado.dom.*`）

基于 [scraper](https://crates.io/crates/scraper)（底层 html5ever / WHATWG HTML5 规范）实现，支持标准 CSS 选择器语法。

### 句柄机制

DOM API 采用 **句柄（handle）** 模式：`parse()` 返回文档句柄字符串，`select()` 返回元素句柄字符串。所有后续操作均通过句柄引用，避免在 JS↔Rust 之间序列化整棵 DOM 树。

- 文档句柄格式：`"D{id}"`（如 `"D0"`）
- 元素句柄格式：`"D{id}E{idx}"`（如 `"D0E3"`）
- 元素句柄可作为 `select` / `selectAll` / `text` / `attr` 等函数的第一个参数（子选择）
- `free()` 可主动释放文档；不调用也无泄漏（线程结束自动清理）

### 基础用法

```js
var html = legado.http.get("https://example.com/book/123");
var doc = legado.dom.parse(html);

// CSS 选择器提取正文
var content = legado.dom.selectText(doc, "#content");

// 提取属性
var cover = legado.dom.selectAttr(doc, '[property="og:image"]', "content");

// 子选择
var nav = legado.dom.select(doc, ".pagination");
if (nav) {
  var nextUrl = legado.dom.selectAttr(nav, "a.next", "href");
}

legado.dom.free(doc);
```

### 章节列表提取

```js
function chapterList(bookUrl) {
  var html = legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);

  var names = legado.dom.selectAllTexts(doc, "#list dd a");
  var urls = legado.dom.selectAllAttrs(doc, "#list dd a", "href");

  var chapters = [];
  for (var i = 0; i < names.length; i++) {
    chapters.push({ name: names[i], url: urls[i] });
  }

  legado.dom.free(doc);
  return chapters;
}
```

### 搜索结果解析

```js
function search(keyword, page) {
  var html = legado.http.get(BASE + "/search?q=" + encodeURIComponent(keyword));
  var doc = legado.dom.parse(html);

  var items = legado.dom.selectAll(doc, ".bookbox");
  var books = [];
  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    books.push({
      name: legado.dom.selectText(el, "h4 a"),
      author: legado.dom.selectText(el, ".author"),
      bookUrl: legado.dom.selectAttr(el, "h4 a", "href"),
      coverUrl: legado.dom.selectAttr(el, "img", "src"),
    });
  }

  legado.dom.free(doc);
  return books;
}
```

### 下一页 & 文本查找

```js
// selectByText 替代原规则 "text.下一页@href"
var nextLink = legado.dom.selectByText(doc, "下一页");
var nextUrl = nextLink ? legado.dom.attr(nextLink, "href") : null;
```

### 移除广告元素

```js
// 从正文 HTML 中去掉广告框
var cleanHtml = legado.dom.remove(doc, ".ad, .sponsor, #baidu_js_push");
```

### 与原规则语法对照

| 原规则语法                             | 等效 `legado.dom.*` 调用                                         |
| -------------------------------------- | ---------------------------------------------------------------- |
| `id.content@html`                      | `dom.selectText(doc, "#content")` 或 `dom.html(el)`              |
| `#content@textNodes`                   | `dom.ownText(el)`（需先 `select`）                               |
| `class.bookbox`                        | `dom.selectAll(doc, ".bookbox")`                                 |
| `tag.a.0@href`                         | `dom.selectAttr(el, "a", "href")`                                |
| `[property="og:novel:author"]@content` | `dom.selectAttr(doc, '[property="og:novel:author"]', "content")` |
| `text.下一页@href`                     | `dom.selectByText(doc, "下一页")` → `dom.attr(el, "href")`       |
| `dl@dd@a`                              | `dom.selectAll(doc, "dl > dd > a")`                              |

## 书源编辑器（`BookSourceEditorModal.vue`）

- 基于 Monaco Editor，离线可用（Vite `?worker` 方案，`main.ts` 配置 `MonacoEnvironment`）
- 支持 JS / TS / JSON 语言（根据文件扩展名自动切换）
- 内置书源 API 类型声明（IntelliSense 补全 `search/toc/content/get/post/xpath` 等）
- `Ctrl+S` 快捷保存，`Shift+Alt+F` 格式化，括号对高亮，Minimap
- 弹窗尺寸：90vw × 85vh

## 实时监听

`watcher.rs` 监听书源目录文件变化，向前端推送 `booksource:changed` 事件，`BookSourceView` 收到后自动刷新列表，编辑器若打开了被修改的文件则自动重载内容。

## 相关文件速查

| 文件                                       | 说明                                             |
| ------------------------------------------ | ------------------------------------------------ |
| `src/views/BookSourceView.vue`             | 书源管理主视图（已安装 / 在线仓库 / 调试三 Tab） |
| `src/components/BookSourceEditorModal.vue` | Monaco 编辑弹窗组件                              |
| `src/composables/useBookSource.ts`         | 书源 CRUD 封装 + `BookSourceMeta` TS 接口 + 模板 |
| `src-tauri/src/booksource/mod.rs`          | Rust 元数据解析、CRUD 命令                       |
| `src-tauri/src/booksource/engine.rs`       | Boa JS 引擎、宿主 API 注入                       |
| `src-tauri/src/cli.rs`                     | CLI 模式：书源测试命令实现                       |
| `src-tauri/src/watcher.rs`                 | 文件系统监听                                     |

---

## CLI 书源测试命令

> 供大模型/自动化脚本调用，无需启动 GUI。

### 前置条件

- 先构建项目：`cd src-tauri && cargo build`（Debug）或 `cargo build --release`（Release）
- 可执行文件位于 `src-tauri/target/debug/legado_tauri.exe`（Windows）
- 书源文件（`.js`）放在 `%APPDATA%\com.q3499.legado_tauri\booksources\`，或直接提供完整路径

### 用法

```
legado_tauri cli booksource-test <文件> <操作> [参数...]
```

#### 文件参数

| 形式     | 示例                        | 说明                               |
| -------- | --------------------------- | ---------------------------------- |
| 完整路径 | `./booksources/22笔趣阁.js` | 绝对或相对路径，直接读取           |
| 仅文件名 | `22笔趣阁.js`               | 在 AppData/booksources/ 中自动查找 |
| 无后缀   | `22笔趣阁`                  | 同上，自动补 `.js` 后缀            |

#### 操作一览

| 操作      | 参数              | 说明                                                         |
| --------- | ----------------- | ------------------------------------------------------------ |
| `search`  | `<关键词> [页码]` | 调用 `search(keyword, page)`，返回书单（默认第 1 页）        |
| `info`    | `<书籍URL>`       | 调用 `bookInfo(bookUrl)`，返回书名/作者/封面/简介            |
| `toc`     | `<书籍URL>`       | 调用 `chapterList(bookUrl)`，返回章节列表                    |
| `content` | `<章节URL>`       | 调用 `chapterContent(chapterUrl)`，返回正文（预览前 300 字） |
| `explore` | `[分类名] [页码]` | 不传分类则测试全部分类；传分类名则测试指定分类               |
| `all`     | `<关键词> [页码]` | 全流程链式：search → info → toc → content → explore          |

### 示例

```bash
# 全流程测试（最常用）
legado_tauri cli booksource-test 22笔趣阁 all 斗破苍穹

# 仅测试搜索
legado_tauri cli booksource-test 22笔趣阁.js search 斗破苍穹

# 使用完整路径
legado_tauri cli booksource-test ./booksources/22笔趣阁.js search 斗破苍穹 2

# 获取书籍详情
legado_tauri cli booksource-test 22笔趣阁 info https://m.22biqu.net/biqu5689/

# 获取章节列表
legado_tauri cli booksource-test 22笔趣阁 toc https://m.22biqu.net/biqu5689/

# 获取正文
legado_tauri cli booksource-test 22笔趣阁 content https://m.22biqu.net/biqu5689/5760632.html

# 发现页 — 测试全部分类
legado_tauri cli booksource-test 22笔趣阁 explore

# 发现页 — 测试指定分类
legado_tauri cli booksource-test 22笔趣阁 explore 玄幻魔法

# 发现页 — 指定分类 + 页码
legado_tauri cli booksource-test 22笔趣阁 explore 玄幻魔法 2

# 绝对路径
legado_tauri cli booksource-test C:\path\to\my\source.js all 斗破苍穹

# 相对路径
legado_tauri cli booksource-test ./booksources/22笔趣阁.js all 斗破苍穹

# 仅文件名（从 AppData 查找）
legado_tauri cli booksource-test 22笔趣阁 all 斗破苍穹
```

### `all` 全流程输出格式

```
书源文件: C:\...\booksources\22笔趣阁.js

╔══════════════════════════════════════════════════════════╗
║  [1/5] search  keyword="斗破苍穹"  page=1               ║
╚══════════════════════════════════════════════════════════╝
  ✓  返回 18 条搜索结果
[ { "name": "斗破苍穹之雷霆震碎", "bookUrl": "..." }, ... ]
  ... 共 18 条，仅展示前 3 条

╔══════════════════════════════════════════════════════════╗
║  [2/5] bookInfo  url=https://m.22biqu.net/biqu83304/    ║
╚══════════════════════════════════════════════════════════╝
  ✓  《斗破苍穹之雷霆震碎》
{ "name": "...", "author": "...", "intro": "...", ... }

╔══════════════════════════════════════════════════════════╗
║  [3/5] chapterList  url=https://m.22biqu.net/biqu83304/ ║
╚══════════════════════════════════════════════════════════╝
  ✓  返回 575 章
[ { "name": "第1章", "url": "..." }, ... ]

╔══════════════════════════════════════════════════════════╗
║  [4/5] chapterContent  url=https://...                  ║
╚══════════════════════════════════════════════════════════╝
  ✓  正文 3200 字

--- 正文预览（前 300 字）---
...（正文内容）

╔══════════════════════════════════════════════════════════╗
║  [5/5] explore  (all categories)                        ║
╚══════════════════════════════════════════════════════════╝
  ✓  发现 11 个分类: 总人气排行, 月排行榜, ...
  ✓    [总人气排行] 50 条
  ✓    [玄幻魔法] 10 条
  ...

──────────────────────────────────────────────────────────
  书源测试摘要
──────────────────────────────────────────────────────────
  ✓  search           18 条
  ✓  bookInfo         《斗破苍穹之雷霆震碎》
  ✓  chapterList      569 章
  ✓  chapterContent   13617 字
  ✓  explore          11/11 分类成功, 270 条
──────────────────────────────────────────────────────────
  通过 5/5
──────────────────────────────────────────────────────────
```

### 给大模型的说明

- **输出格式**：每个步骤以 `╔═══╗` 框标注步骤编号和参数，结果为纯文本 + JSON
- **错误显示**：步骤失败时输出 `✗  错误原因`，`all` 模式下后续依赖步骤自动跳过
- **explore 多分类**：`explore` 支持传入分类名测试指定分类，不传则测试全部分类
- **退出码**：路径解析失败时以非 0 退出，其余情况均以 0 退出
- **书源 JS 约定**：书源脚本需实现 `search/bookInfo/chapterList/chapterContent` 四个函数，`explore` 可选

## HTML 交互发现页

### 概述

`explore()` 函数除了返回标准的 `string[]`（分类列表）和 `BookItem[]`（书籍列表）外，
还支持返回 **HTML 交互页面**。HTML 在沙箱 iframe 中渲染，注入 `window.legado` 桥接 API，
实现丰富的用户交互（筛选、设置、个人中心等）。

### 返回类型

| 返回值类型 | 行为 |
|---|---|
| `string[]` | 分类名数组（`explore(page, 'GETALL')` 时） |
| `BookItem[]` | 书籍列表（标准模式） |
| `{ type: 'html', html: string, title?: string }` | HTML 交互页（新增） |

### Bridge API（`window.legado`）

HTML 页面渲染在 `sandbox="allow-scripts"` 的 iframe 中，无直接网络访问权限。
所有外部操作通过注入的 `window.legado` 对象进行，底层走 postMessage + Tauri invoke。

| 方法 | 说明 | 返回值 |
|---|---|---|
| `legado.http.get(url, headers?)` | HTTP GET 请求 | `Promise<string>` |
| `legado.http.post(url, body, headers?)` | HTTP POST 请求 | `Promise<string>` |
| `legado.config.read(key)` | 读取持久化配置（scope = 书源文件名） | `Promise<string>` |
| `legado.config.write(key, value)` | 写入持久化配置 | `Promise<void>` |
| `legado.callSource(fnName, ...args)` | 调用当前书源的 JS 函数 | `Promise<any>` |
| `legado.explore(category, page?)` | 导航到另一个发现分类（替换 iframe） | `Promise<void>` |
| `legado.toast(msg, type?)` | 显示通知（type: info/success/error/warning） | `void` |
| `legado.openBook(bookUrl)` | 打开书籍详情抽屉 | `void` |
| `legado.search(keyword)` | 触发全局搜索 | `void` |
| `legado.log(msg)` | 控制台日志 | `void` |

### 示例

```js
function explore(page, category) {
  if (category === 'GETALL') {
    return ['玄幻', '仙侠', '设置'];
  }

  if (category === '设置') {
    return {
      type: 'html',
      html: `
        <h3>书源设置</h3>
        <div class="card mt-sm">
          <label>偏好：</label>
          <select id="pref">
            <option value="male">男生</option>
            <option value="female">女生</option>
          </select>
          <button class="primary mt-sm" onclick="savePref()">保存</button>
        </div>
        <script>
          async function savePref() {
            const val = document.getElementById('pref').value;
            await legado.config.write('preference', val);
            legado.toast('已保存', 'success');
          }
          // 初始化时读取已保存的配置
          legado.config.read('preference').then(v => {
            if (v) document.getElementById('pref').value = v;
          });
        <\/script>
      `
    };
  }

  // 标准书籍列表
  const resp = legado.http.get('https://api.example.com/books?cat=' + category);
  const data = JSON.parse(resp);
  return data.books.map(b => ({
    name: b.title,
    author: b.author,
    bookUrl: b.url,
    coverUrl: b.cover,
    kind: category
  }));
}
```

### 安全约束

- iframe 使用 `sandbox="allow-scripts"`，禁止 same-origin、表单提交、弹窗、导航
- 所有 HTTP 请求通过 Tauri 后端代理，iframe 内无直接网络访问
- `callSource` 仅限调用当前书源文件中定义的函数
- Bridge 请求超时 60s
- 注入基础 CSS 样式（暗色/亮色适配），书源可直接使用 CSS 变量

### Tauri 命令（内部使用）

| 命令 | 说明 |
|---|---|
| `booksource_call_fn` | 调用书源的任意导出函数（fn_name 需为合法 JS 标识符） |
| `booksource_http_proxy` | HTTP 代理（GET/POST），供 iframe bridge 使用 |
