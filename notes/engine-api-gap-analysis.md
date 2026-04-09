# Rust 脚本引擎 API 差距分析

> 日期：2026-04-07
> 对比对象：当前 Boa 引擎注入 API vs tmp-booksources (Legado Android) 书源常用工具

---

## 当前已实现

- [x] `legado.http.get(url, headers?)` — 同步 GET，默认 Chrome UA，超时 15s
- [x] `legado.http.post(url, body, headers?)` — 同步 POST，默认 form-urlencoded
- [x] `legado.log(msg)` — 输出到 stderr + `script:log` 事件
- [x] `console.log/info/warn/error/debug` — 输出到 stderr
- [x] `legado.config.read(scope, key)` — 读取字符串配置
- [x] `legado.config.write(scope, key, value)` — 写入字符串配置
- [x] `legado.config.readBytes(scope, key)` — 读取字节数组
- [x] `legado.config.writeBytes(scope, key, bytes)` — 写入字节数组
- [x] `legado.ui.emit(event, data)` — 向前端推送事件
- [x] JS 内置：JSON/RegExp/String/Array/Math/Date 等（Boa 引擎自带）
- [x] `legado.base64Encode(str)` / `legado.base64Decode(str)` — Base64 编解码
- [x] `btoa(str)` / `atob(str)` — 浏览器风格 Base64
- [x] `legado.urlEncode(str)` / `legado.urlDecode(str)` — URL 编解码
- [x] `legado.htmlEncode(str)` / `legado.htmlDecode(str)` — HTML 实体编解码
- [x] `legado.md5(str)` — MD5 哈希
- [x] `legado.sha1(str)` / `legado.sha256(str)` — SHA 哈希
- [x] `legado.hmacSha256(data, key)` — HMAC-SHA256
- [x] `legado.aesEncrypt/aesDecrypt(data, key, iv?, mode?)` — AES 加解密（CBC/ECB）
- [x] `legado.desEncrypt/desDecrypt(data, key, iv?)` — DES-CBC 加解密
- [x] `legado.toast(msg)` — UI 提示通知

---

## 🔴 严重缺失（高频，几乎所有书源依赖）

- [ ] CSS 选择器解析 HTML — `@css:div.bookinfo h2@text` → Rust `scraper` crate
- [ ] XPath 解析 HTML — `//meta[@property='og:novel:author']/@content`
- [ ] JSONPath 解析 — `$.data[*].name` → Rust `jsonpath-rust` crate

---

## 🟡 中等缺失（大量书源使用）

- [ ] 时间戳格式化 — `java.timeFormat(ts)` → Rust `chrono` crate
- [ ] Cookie 管理 — `java.getCookie/removeCookie` → 扩展 HTTP 模块
- [ ] 临时缓存 — `cache.get/put/delete` → 内存 HashMap

---

## 🟠 高级缺失（部分加密站使用）

- [ ] RSA 加解密 — 非对称加密 → Rust `rsa` crate

---

## 说明

本项目书源格式是**纯 JS 函数式**（`search()`, `bookInfo()`, `chapterList()`, `chapterContent()`），不需要兼容 Legado Android 的声明式 DSL 语法（`@css:`, `@xpath:`, `##replace##`, `@put/@get` 等）。

需要做的是：在 Boa JS 引擎中**注入工具函数**，让书源 JS 开发者能方便地调用，而不是手写正则解析 HTML。

---

## TODO

<!-- 待补充 -->
