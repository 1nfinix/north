#!/usr/bin/env python3
"""用法：fill_template.py <模板> <内容计划.json> <输出.pptx>；成功 0，输入错误 1，超出或未填入 2。"""

import argparse
import json
import math
from pathlib import Path
import sys
sys.dont_write_bytecode = True
import unicodedata

from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION, XL_LEGEND_POSITION
from pptx.enum.shapes import PP_PLACEHOLDER
from pptx.enum.text import MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.util import Inches, Pt

sys.path.insert(0, str(Path(__file__).resolve().parent))  # 同目录的 deck_common 在任何启动方式下都可导入
from deck_common import CONTENT_TYPES, TEXT_TYPES, match_layout, open_deck, remove_shape

CHART_TYPES = {'column': XL_CHART_TYPE.COLUMN_CLUSTERED, 'bar': XL_CHART_TYPE.BAR_CLUSTERED,
               'line': XL_CHART_TYPE.LINE, 'pie': XL_CHART_TYPE.PIE,
               'doughnut': XL_CHART_TYPE.DOUGHNUT,
               'stacked_column': XL_CHART_TYPE.COLUMN_STACKED}


def validate(plan, plan_path):
    if not isinstance(plan, dict) or not isinstance(plan.get('slides'), list):
        raise ValueError('内容计划须为包含 slides 数组的 JSON 对象。')
    for index, slide in enumerate(plan['slides'], 1):
        prefix = f'第 {index} 页'
        if not isinstance(slide, dict) or type(slide.get('layout')) not in (str, int):
            raise ValueError(f'{prefix}的 layout 必须是版式名称或整数序号。')
        for key in ('title', 'subtitle', 'notes', 'image'):
            if key in slide and not isinstance(slide[key], str):
                raise ValueError(f'{prefix}的 {key} 必须是字符串。')
        if 'bullets' in slide:
            if not isinstance(slide['bullets'], list):
                raise ValueError(f'{prefix}的 bullets 必须是数组。')
            for item in slide['bullets']:
                if isinstance(item, str):
                    continue
                if not isinstance(item, dict) or not isinstance(item.get('text'), str) or \
                        type(item.get('level')) is not int or item['level'] < 0 or item['level'] > 8:
                    raise ValueError(f'{prefix}的 bullets 项须为字符串或含 text 与 0–8 级 level 的对象。')
        if 'chart' in slide:
            chart = slide['chart']
            if not isinstance(chart, dict) or not isinstance(chart.get('type'), str) or chart['type'] not in CHART_TYPES:
                raise ValueError(f'{prefix}的 chart.type 必须是 {"、".join(CHART_TYPES)} 之一。')
            cats = chart.get('categories')
            series = chart.get('series')
            if not isinstance(cats, list) or not all(isinstance(x, str) for x in cats) or not cats:
                raise ValueError(f'{prefix}的 chart.categories 须为非空字符串数组。')
            if not isinstance(series, list) or not series:
                raise ValueError(f'{prefix}的 chart.series 须为非空数组。')
            for entry in series:
                if not isinstance(entry, dict) or not isinstance(entry.get('name'), str) or \
                        not isinstance(entry.get('values'), list) or len(entry['values']) != len(cats) or \
                        not all(type(value) in (int, float) and math.isfinite(value) for value in entry['values']):
                    raise ValueError(f'{prefix}的图表系列须有名称，数值须与分类等长且为有限数字。')
            for key in ('title', 'source'):
                if key in chart and not isinstance(chart[key], str):
                    raise ValueError(f'{prefix}的 chart.{key} 必须是字符串。')
        if 'table' in slide:
            table = slide['table']
            if not isinstance(table, dict) or not isinstance(table.get('columns'), list) or \
                    not table['columns'] or not all(isinstance(x, str) for x in table['columns']) or \
                    not isinstance(table.get('rows'), list) or \
                    not all(isinstance(row, list) and len(row) == len(table['columns']) and
                            all(isinstance(value, str) for value in row) for row in table['rows']):
                raise ValueError(f'{prefix}的 table 须有字符串表头及等宽的字符串行。')
        if 'image' in slide and not (plan_path.parent / slide['image']).is_file():
            raise ValueError(f'{prefix}的图片不存在：{slide["image"]}。请检查相对计划文件的路径。')


def estimated_lines(text, width, font_pt):
    available = max(1, width / 12700 - 8)
    capacity = max(1, available / font_pt)
    lines = 0
    for raw in text.split('\n'):
        units = sum(1 if unicodedata.east_asian_width(char) in 'WF' else 0.55 for char in raw)
        lines += max(1, math.ceil(units / capacity))
    return lines


def fit_text(shape, paragraphs, kind, report, label):
    minimum, start = (20, 32) if kind == 'title' else (14, 20)
    for size in range(start, minimum - 1, -1):
        needed = 0
        for text, level in paragraphs:
            indent_width = max(shape.width * (1 - level * 0.10), shape.width * 0.35)
            needed += estimated_lines(text, indent_width, size) * size * 1.18
        available = shape.height / 12700 - 7
        if needed <= available:
            break
    else:
        size = minimum
        report['overflow'].append(label)
    if size < start:
        report['shrunk'].append(f'{label} {start}→{size} 磅')
    for paragraph in shape.text_frame.paragraphs:
        paragraph.font.size = Pt(size)
        for run in paragraph.runs:
            run.font.size = Pt(size)


def set_text(shape, value, report, label, kind='body'):
    shape.text_frame.clear()
    shape.text_frame.paragraphs[0].text = value
    fit_text(shape, [(value, 0)], kind, report, label)
    report['filled'].append(f'{label}→idx {shape.placeholder_format.idx}' if shape.is_placeholder else label)


def content_region(slide, deck):
    margin = Inches(0.8)
    title_bottom = max((shape.top + shape.height for shape in slide.placeholders
                        if shape.placeholder_format.type in (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE)),
                       default=Inches(0.6))
    top = min(title_bottom + Inches(0.25), deck.slide_height - Inches(1.0))
    return margin, top, deck.slide_width - margin * 2, deck.slide_height - top - margin


def add_visual(slide, deck, entry, field, region, plan_path, report, target=None):
    x, y, width, height = region
    source = entry.get('source') if field == 'chart' else None
    if source:
        height -= Inches(0.35)
    if field == 'chart':
        data = CategoryChartData()
        data.categories = entry['categories']
        for series in entry['series']:
            data.add_series(series['name'], series['values'])
        shape = (target.insert_chart(CHART_TYPES[entry['type']], data) if target is not None and
                 hasattr(target, 'insert_chart') and not source else
                 slide.shapes.add_chart(CHART_TYPES[entry['type']], x, y, width, height, data))
        chart = shape.chart
        is_pie = entry['type'] in ('pie', 'doughnut')
        chart.font.size = Pt(10)
        chart.has_legend = len(entry['series']) > 1
        if chart.has_legend:
            chart.legend.position = XL_LEGEND_POSITION.BOTTOM
            chart.legend.font.size = Pt(10)
        plot = chart.plots[0]
        plot.has_data_labels = True
        labels = plot.data_labels
        labels.show_value = not is_pie
        labels.show_percentage = is_pie
        labels.show_category_name = is_pie
        labels.font.size = Pt(10)
        if entry['type'] == 'line':
            labels.position = XL_LABEL_POSITION.ABOVE
        elif entry['type'] in ('column', 'bar'):
            labels.position = XL_LABEL_POSITION.OUTSIDE_END
        if not is_pie:
            for axis in (chart.category_axis, chart.value_axis):
                axis.tick_labels.font.size = Pt(10)
            chart.value_axis.has_major_gridlines = True
            chart.value_axis.has_minor_gridlines = False
            gridline = chart.value_axis.major_gridlines.format.line
            gridline.color.rgb = RGBColor(0xD9, 0xD9, 0xD9)
            gridline.width = Pt(0.5)
        if entry.get('title'):
            chart.has_title = True
            chart.chart_title.text_frame.text = entry['title']
            for paragraph in chart.chart_title.text_frame.paragraphs:
                paragraph.font.size = Pt(14)
                paragraph.font.bold = True
    elif field == 'table':
        rows, cols = len(entry['rows']) + 1, len(entry['columns'])
        table_height = min(height, Inches(0.45) * rows)
        shape = (target.insert_table(rows, cols) if target is not None and hasattr(target, 'insert_table') else
                 slide.shapes.add_table(rows, cols, x, y, width, table_height))
        for table_row in shape.table.rows:
            table_row.height = table_height // rows
        for col, text in enumerate(entry['columns']):
            shape.table.cell(0, col).text = text
        for row, values in enumerate(entry['rows'], 1):
            for col, text in enumerate(values):
                shape.table.cell(row, col).text = text
        for row in shape.table.rows:
            for cell in row.cells:
                cell.vertical_anchor = MSO_ANCHOR.MIDDLE
                for paragraph in cell.text_frame.paragraphs:
                    paragraph.font.size = Pt(14)
        if x + width > deck.slide_width or y + shape.height > deck.slide_height:
            report['overflow'].append('table：超出页面')
    else:
        path = plan_path.parent / entry
        from PIL import Image
        with Image.open(path) as bitmap:
            pixels_w, pixels_h = bitmap.size
        scale = min(width / pixels_w, height / pixels_h)
        picture_w, picture_h = int(pixels_w * scale), int(pixels_h * scale)
        shape = slide.shapes.add_picture(str(path), x + (width - picture_w) // 2,
                                         y + (height - picture_h) // 2, picture_w, picture_h)
    if source:
        foot = slide.shapes.add_textbox(x, y + height, width, Inches(0.3))
        foot.name = 'ppt-report source'
        foot.text = source
        for paragraph in foot.text_frame.paragraphs:
            paragraph.font.size = Pt(10)
            paragraph.font.color.rgb = RGBColor(0x7F, 0x7F, 0x7F)
    report['filled'].append(field)
    return shape


def fill(deck, plan, plan_path):
    for slide_id in list(deck.slides._sldIdLst):
        deck.part.drop_rel(slide_id.rId)
        deck.slides._sldIdLst.remove(slide_id)
    reports = []
    for number, entry in enumerate(plan['slides'], 1):
        layout = match_layout(deck, entry['layout'])
        slide = deck.slides.add_slide(layout)
        report = {'number': number, 'layout': layout.name, 'filled': [], 'shrunk': [], 'overflow': [], 'unfilled': []}
        used = set()
        slots = list(slide.placeholders)
        title = next((s for s in slots if s.placeholder_format.type in
                      (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE)), None)
        if 'title' in entry:
            if title is None:
                report['unfilled'].append('title')
            else:
                set_text(title, entry['title'], report, 'title', 'title')
                used.add(title.shape_id)
        if 'subtitle' in entry:
            subtitle = next((s for s in slots if s.shape_id not in used and
                             s.placeholder_format.type == PP_PLACEHOLDER.SUBTITLE), None)
            if subtitle is None:
                subtitle = next((s for s in slots if s.shape_id not in used and
                                 s.placeholder_format.type in TEXT_TYPES), None)
            if subtitle is None:
                report['unfilled'].append('subtitle')
            else:
                set_text(subtitle, entry['subtitle'], report, 'subtitle')
                used.add(subtitle.shape_id)
        content = [s for s in slots if s.shape_id not in used and s.placeholder_format.type in CONTENT_TYPES]
        if 'bullets' in entry:
            body = next((s for s in content if s.has_text_frame), None)
            if body is None:
                report['unfilled'].append('bullets')
            else:
                body.text_frame.clear()
                items = [(item, 0) if isinstance(item, str) else (item['text'], item['level'])
                         for item in entry['bullets']]
                for offset, (value, level) in enumerate(items):
                    paragraph = body.text_frame.paragraphs[0] if offset == 0 else body.text_frame.add_paragraph()
                    paragraph.text = value
                    paragraph.level = level
                if items:
                    fit_text(body, items, 'body', report, 'bullets')
                report['filled'].append(f'bullets→idx {body.placeholder_format.idx}')
                used.add(body.shape_id)
                content.remove(body)
        visuals = [field for field in ('chart', 'table', 'image') if field in entry]
        for field in visuals:
            if 'bullets' in entry and not content:
                report['unfilled'].append(field)
                continue
            target = content.pop(0) if content else None
            region = ((target.left, target.top, target.width, target.height)
                      if target is not None else content_region(slide, deck))
            if target is not None:
                used.add(target.shape_id)
            add_visual(slide, deck, entry[field], field, region, plan_path, report, target)
            if target is not None and target._element.getparent() is not None:
                remove_shape(target)
        if 'notes' in entry:
            slide.notes_slide.notes_text_frame.text = entry['notes']
            report['filled'].append('notes')
        for shape in slots:
            if shape.shape_id not in used and shape._element.getparent() is not None:
                remove_shape(shape)
        reports.append(report)
    return reports


def main():
    parser = argparse.ArgumentParser(description='按内容计划填充 PPT 模板。')
    parser.add_argument('template')
    parser.add_argument('plan')
    parser.add_argument('output')
    args = parser.parse_args()
    try:
        plan_path = Path(args.plan)
        if not plan_path.is_file():
            raise ValueError(f'内容计划不存在：{plan_path}。')
        if Path(args.output).suffix.lower() != '.pptx':
            raise ValueError('输出文件名必须以 .pptx 结尾。')
        try:
            plan = json.loads(plan_path.read_text(encoding='utf-8'))
        except json.JSONDecodeError as error:
            raise ValueError(f'内容计划 JSON 格式错误：第 {error.lineno} 行第 {error.colno} 列。') from error
        validate(plan, plan_path)
        with open_deck(args.template) as deck:
            reports = fill(deck, plan, plan_path)
            deck.save(args.output)
    except (ValueError, OSError, KeyError, TypeError) as error:
        print(f'错误：{error}', file=sys.stderr)
        return 1
    for report in reports:
        print(f"第 {report['number']} 页｜版式：{report['layout']}｜已填：{'、'.join(report['filled']) or '无'}"
              f"｜自动缩小：{'、'.join(report['shrunk']) or '无'}"
              f"｜超出：{'、'.join(report['overflow']) or '无'}"
              f"｜未填入：{'、'.join(report['unfilled']) or '无'}")
    return 2 if any(r['overflow'] or r['unfilled'] for r in reports) else 0


if __name__ == '__main__':
    sys.exit(main())
