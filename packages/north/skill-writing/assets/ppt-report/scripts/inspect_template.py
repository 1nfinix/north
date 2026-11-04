#!/usr/bin/env python3
"""用法：inspect_template.py <模板.pptx|.potx> [--json]；成功退出 0，输入错误退出 1。"""

import argparse
import json
from pathlib import Path
import sys
sys.dont_write_bytecode = True

from pptx.enum.shapes import PP_PLACEHOLDER
from pptx.util import Cm
sys.path.insert(0, str(Path(__file__).resolve().parent))  # 同目录的 deck_common 在任何启动方式下都可导入
from deck_common import open_deck, theme_info


def purpose(layout):
    kinds = [shape.placeholder_format.type for shape in layout.placeholders]
    content = sum(kind in (PP_PLACEHOLDER.BODY, PP_PLACEHOLDER.OBJECT) for kind in kinds)
    name = layout.name
    if '结束' in name:
        return '结束页'
    if '节' in name or '章' in name:
        return '节标题'
    if '空白' in name or not kinds:
        return '空白'
    if content >= 2:
        return '两栏'
    if PP_PLACEHOLDER.SUBTITLE in kinds:
        return '封面'
    if content:
        return '正文'
    if any(kind in (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE) for kind in kinds):
        return '仅标题'
    return '其他'


def inspect(path):
    with open_deck(path) as deck:
        layouts = []
        for number, layout in enumerate(deck.slide_layouts):
            slots = []
            for shape in layout.placeholders:
                kind = shape.placeholder_format.type
                slots.append({'idx': shape.placeholder_format.idx, 'type': kind.name,
                              'x_cm': round(shape.left / Cm(1), 1), 'y_cm': round(shape.top / Cm(1), 1),
                              'width_cm': round(shape.width / Cm(1), 1),
                              'height_cm': round(shape.height / Cm(1), 1)})
            layouts.append({'index': number, 'name': layout.name, 'purpose': purpose(layout), 'placeholders': slots})
        return {'width_cm': round(deck.slide_width / Cm(1), 1),
                'height_cm': round(deck.slide_height / Cm(1), 1),
                'layouts': layouts, 'theme': theme_info(deck), 'example_slides': len(deck.slides)}


def main():
    parser = argparse.ArgumentParser(description='查看模板版式、占位符和主题。')
    parser.add_argument('template', help='PPTX 或 POTX 模板路径')
    parser.add_argument('--json', action='store_true', help='输出 JSON')
    args = parser.parse_args()
    try:
        result = inspect(args.template)
    except (ValueError, OSError, KeyError) as error:
        print(f'错误：{error}', file=sys.stderr)
        return 1
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"尺寸：{result['width_cm']} × {result['height_cm']} 厘米；示例页：{result['example_slides']} 页")
        for layout in result['layouts']:
            print(f"{layout['index']}. {layout['name']}（{layout['purpose']}）")
            for slot in layout['placeholders']:
                print(f"  idx {slot['idx']} {slot['type']}：({slot['x_cm']}, {slot['y_cm']})，{slot['width_cm']} × {slot['height_cm']} 厘米")
        theme = result['theme']
        for key, label in [('title', '标题'), ('body', '正文')]:
            font = theme['fonts'].get(key, {})
            print(f"{label}字体：{font.get('latin', '未知')}；东亚：{font.get('eastAsia', '未知')}")
        print('主题配色：' + '、'.join(f'{key} #{value}' for key, value in theme['colors'].items()))
    return 0


if __name__ == '__main__':
    sys.exit(main())
