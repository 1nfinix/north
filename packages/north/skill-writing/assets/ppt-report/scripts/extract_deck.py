#!/usr/bin/env python3
"""用法：extract_deck.py <已有.pptx> <输出目录>；成功退出 0，输入错误退出 1。"""

import argparse
import json
from pathlib import Path
import sys
sys.dont_write_bytecode = True

from pptx.enum.shapes import MSO_SHAPE_TYPE, PP_PLACEHOLDER
from pptx.util import Cm

sys.path.insert(0, str(Path(__file__).resolve().parent))  # 同目录的 deck_common 在任何启动方式下都可导入
from deck_common import open_deck
from fill_template import CHART_TYPES

REVERSE_CHART_TYPES = {value: key for key, value in CHART_TYPES.items()}


def extract(input_path, output):
    output.mkdir(parents=True, exist_ok=True)
    images = output / 'images'
    plans, shape_pages = [], []
    with open_deck(input_path) as deck:
        for number, slide in enumerate(deck.slides, 1):
            plan = {'layout': slide.slide_layout.name}
            bullets = []
            records = []
            plain_text = []
            for shape in slide.shapes:
                records.append({'shape_id': shape.shape_id, 'name': shape.name,
                                'type': shape.shape_type.name, 'is_placeholder': shape.is_placeholder,
                                'x_cm': round(shape.left / Cm(1), 1), 'y_cm': round(shape.top / Cm(1), 1),
                                'width_cm': round(shape.width / Cm(1), 1),
                                'height_cm': round(shape.height / Cm(1), 1),
                                'text_preview': (shape.text[:80] if shape.has_text_frame else '')})
                if shape.has_chart and 'chart' not in plan:
                    chart = shape.chart
                    try:
                        chart_type = REVERSE_CHART_TYPES[chart.chart_type]
                    except KeyError:
                        raise ValueError(f'第 {number} 页有不支持的图表类型：{chart.chart_type}。') from None
                    plot = chart.plots[0]
                    chart_entry = {'type': chart_type,
                                   'categories': [category.label for category in plot.categories],
                                   'series': [{'name': series.name, 'values': list(series.values)}
                                              for series in chart.series]}
                    if chart.has_title:
                        chart_entry['title'] = chart.chart_title.text_frame.text
                    plan['chart'] = chart_entry
                elif shape.has_table and 'table' not in plan:
                    table = shape.table
                    plan['table'] = {'columns': [table.cell(0, col).text for col in range(len(table.columns))],
                                     'rows': [[table.cell(row, col).text for col in range(len(table.columns))]
                                              for row in range(1, len(table.rows))]}
                elif shape.shape_type == MSO_SHAPE_TYPE.PICTURE and 'image' not in plan:
                    images.mkdir(exist_ok=True)
                    filename = f'slide{number}-1.{shape.image.ext}'
                    (images / filename).write_bytes(shape.image.blob)
                    plan['image'] = f'images/{filename}'
                elif shape.has_text_frame and shape.text:
                    if shape.name == 'ppt-report source' and 'chart' in plan:
                        plan['chart']['source'] = shape.text
                    elif shape.is_placeholder and shape.placeholder_format.type in \
                            (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE):
                        plan['title'] = shape.text
                    elif shape.is_placeholder and shape.placeholder_format.type == PP_PLACEHOLDER.SUBTITLE:
                        plan['subtitle'] = shape.text
                    else:
                        plain_text.append(shape)
            plain_text.sort(key=lambda shape: (shape.top, shape.left))
            if 'title' not in plan and plain_text:
                first = plain_text.pop(0)
                plan['title'] = first.text
            for shape in plain_text:
                for paragraph in shape.text_frame.paragraphs:
                    if not paragraph.text:
                        continue
                    bullets.append(paragraph.text if paragraph.level == 0 else
                                   {'text': paragraph.text, 'level': paragraph.level})
            if bullets:
                plan['bullets'] = bullets
            if slide.has_notes_slide:
                notes = slide.notes_slide.notes_text_frame.text.strip()
                if notes:
                    plan['notes'] = notes
            plans.append(plan)
            shape_pages.append({'slide': number, 'shapes': records})
    (output / 'plan.json').write_text(json.dumps({'slides': plans}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (output / 'shapes.json').write_text(json.dumps({'slides': shape_pages}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return len(plans)


def main():
    parser = argparse.ArgumentParser(description='提取 PPT 内容计划和形状编号。')
    parser.add_argument('input')
    parser.add_argument('output_dir')
    args = parser.parse_args()
    try:
        if Path(args.input).suffix.lower() != '.pptx':
            raise ValueError('已有文件必须是 .pptx。')
        count = extract(args.input, Path(args.output_dir))
    except (ValueError, OSError, KeyError, IndexError) as error:
        print(f'错误：{error}', file=sys.stderr)
        return 1
    print(f'已提取 {count} 页：{Path(args.output_dir) / "plan.json"}、shapes.json')
    return 0


if __name__ == '__main__':
    sys.exit(main())
