# 内容计划格式

`fill_template.py` 读取、`extract_deck.py` 输出的 JSON（UTF-8）。

```json
{
  "slides": [
    {
      "layout": "标题幻灯片",
      "title": "2026年三季度经营情况汇报",
      "subtitle": "××部　2026年10月"
    },
    {
      "layout": "标题和内容",
      "title": "三季度存款增长 12%，超额完成目标",
      "bullets": [
        "个人存款贡献增量的七成",
        { "text": "新增客户 3,200 户", "level": 1 },
        "对公存款增速回升"
      ],
      "notes": "讲稿备注，可省略"
    },
    {
      "layout": "标题和内容",
      "title": "存款连续三个季度增长",
      "chart": {
        "type": "column",
        "title": "各季度存款余额（亿元）",
        "categories": ["一季度", "二季度", "三季度"],
        "series": [{ "name": "存款余额", "values": [120, 128, 143] }],
        "source": "数据来源：××，截至2026年9月30日"
      }
    },
    {
      "layout": "标题和内容",
      "title": "重点项目进度",
      "table": {
        "columns": ["项目", "负责人", "进度"],
        "rows": [["××系统上线", "××", "已完成"], ["××网点改造", "××", "80%"]]
      }
    },
    {
      "layout": "仅标题",
      "title": "现场照片",
      "image": "images/slide4-1.png"
    }
  ]
}
```

## 字段

| 字段 | 说明 |
|------|------|
| `layout` | 必填。模板版式名称，取 `inspect_template.py` 列出的名称；也可写版式序号（整数）。 |
| `title` | 页标题，填入标题占位符。 |
| `subtitle` | 副标题，填入副标题占位符；没有时填入第二个文本占位符。 |
| `bullets` | 要点列表；字符串为一级，`{"text", "level"}` 指定层级（0 起）。填入正文占位符。 |
| `chart` | 原生图表：`type` 取 `column`、`bar`、`line`、`pie`、`doughnut`、`stacked_column`；`categories` 与每个 `series.values` 等长；`title`、`source` 可选。 |
| `table` | 原生表格：`columns` 为表头，`rows` 为各行，单元格写字符串。 |
| `image` | 图片路径，相对于内容计划文件所在目录。 |
| `notes` | 演讲者备注。 |

一页可以同时有 `bullets` 和 `chart`（或 `table`、`image`），前提是版式有两个内容区；否则拆成两页。图表、表格和图片放在版式的内容占位符位置，版式没有内容占位符时放在标题以下的正文区域。

## 检查报告

`fill_template.py` 结束时打印每页结果：使用的版式、填入的占位符、字号是否自动缩小、仍然超出的占位符和未能填入的字段。报告中有「超出」或「未填入」时必须处理后重新生成。
