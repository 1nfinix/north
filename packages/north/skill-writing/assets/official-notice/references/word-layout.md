# Word 排版要求

生成公文 `.docx` 时逐项设置，字体名称按原样写入，不要替换成其他字体（单位电脑已安装）。

## 页面

A4 纵向；上边距 3.7 cm，下边距 3.5 cm，左边距 2.8 cm，右边距 2.6 cm。

## 字体与字号

| 元素 | 字体 | 字号 | 加粗 |
|------|------|------|------|
| 公文标题（仅完整公文） | 方正小标宋简体 | 二号（22 磅） | 是 |
| 一级标题「一、」 | 黑体 | 小三（15 磅） | 是 |
| 二级标题「（一）」 | 楷体_GB2312 | 小三（15 磅） | 否 |
| 三、四级标题「1．」「（1）」 | 仿宋_GB2312 | 小三（15 磅） | 否 |
| 正文 | 仿宋_GB2312 | 小三（15 磅） | 否 |

## 段落

- 行距：固定值 30 磅；段前、段后 0。
- 首行缩进 32 磅（2 字符），正文和各级标题统一设置。
- 对齐：两端对齐。
- 同一段里小标题后接正文时，小标题部分用标题字体，后面的正文用仿宋_GB2312。

## 引号

英文双引号 `"` 一律换成中文引号，按出现次序交替使用左引号「“」和右引号「”」。

## 附件文档

- 第 1 行顶格写「附件1」「附件2」，小三号黑体，不加冒号；只有一个附件时只写「附件」。
- 第 3 行居中写附件标题，方正小标宋简体、小二号、加粗；正文格式与发文正文相同。
- 以图表为主的附件：附件标识黑体 15 号，标题方正小标宋简体 18 号加粗；不加背景色，不吞字，删除多余的空白 sheet。附件包含多个子附件时加目录或附件列表。
- 附件可上传 `.doc`、`.docx`、`.xls`、`.xlsx`、`.pdf`、`.wps`、`.et` 等格式。

## python-docx 要点

```python
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.shared import Cm, Pt

def chinese_quotes(text):
    out, left = [], True
    for ch in text:
        if ch == '"':
            out.append('“' if left else '”')
            left = not left
        else:
            out.append(ch)
    return ''.join(out)

def setup_page(doc):
    for s in doc.sections:
        s.top_margin, s.bottom_margin = Cm(3.7), Cm(3.5)
        s.left_margin, s.right_margin = Cm(2.8), Cm(2.6)

def add_run(para, text, font='仿宋_GB2312', bold=False, size=15):
    run = para.add_run(chinese_quotes(text))
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), font)
    return run

def add_paragraph(doc):
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf = para.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    pf.line_spacing = Pt(30)   # 必须用 Pt()，直接写 30 会被当作极小单位，每页只剩一行
    pf.first_line_indent = Pt(32)
    pf.space_before = pf.space_after = Pt(0)
    return para
```

生成后重新打开文件，核对字体、字号、行距和首行缩进是否已写入。
