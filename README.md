# Paper Digest v2

微电子材料 / 晶体管论文晨报的 GitHub Pages v2 前端。

## 设计原则

- UI 与数据分离：HTML/CSS/JS 固定在仓库中；每日任务只更新 `data/latest.json`。
- 无构建步骤：纯静态页面，GitHub Pages 直接发布。
- 响应式布局：同一套 UI 兼容 PC 和手机，避免多份 HTML 被同步脚本覆盖后漂移。
- 兼容旧字段：支持 `abstract_cn` / `overview_cn`、`reading_notes` / `keyword_extract`。

## 数据入口

每日晨报脚本生成：

```text
/home/XiaomiaoClaw/.openclaw/workspace/reports/paper_digest/latest.json
```

发布时只覆盖：

```text
data/latest.json
```
