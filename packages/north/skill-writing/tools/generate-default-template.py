#!/usr/bin/env python3
"""Generate the neutral editable PPT template with python-pptx 1.0.2."""

from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZipFile
import xml.etree.ElementTree as ET

from pptx import Presentation
from pptx.util import Inches
from pptx.enum.shapes import PP_PLACEHOLDER

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets/ppt-report/assets/default-template.pptx'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'


def edit_theme(data):
    root = ET.fromstring(data)
    ns = {'a': A}
    theme = root.find('.//a:themeElements', ns)
    colors = theme.find('a:clrScheme', ns)
    values = {'dk1': '111827', 'lt1': 'FFFFFF', 'dk2': '334155', 'lt2': 'F7F5F0',
              'accent1': '183A63', 'accent2': '64748B', 'accent3': 'D9DEE7',
              'accent4': '527FA3', 'accent5': '8CA2B4', 'accent6': 'A5B4C2'}
    for child in colors:
        key = child.tag.split('}')[-1]
        if key in values:
            color = next(iter(child))
            color.attrib.clear()
            color.set('val' if color.tag.endswith('srgbClr') else 'lastClr', values[key])
    for font in theme.findall('.//a:fontScheme/a:majorFont', ns) + theme.findall('.//a:fontScheme/a:minorFont', ns):
        latin = font.find('a:latin', ns)
        if latin is not None:
            latin.set('typeface', 'Aptos')
        east = font.find('a:ea', ns)
        if east is not None:
            east.set('typeface', 'Microsoft YaHei')
        for child in font.findall('a:font', ns):
            if child.get('script') in ('Hans', 'Hant'):
                child.set('typeface', 'Microsoft YaHei')
    return ET.tostring(root, encoding='utf-8', xml_declaration=True)


def main():
    presentation = Presentation()
    presentation.slide_width = Inches(13.333)
    presentation.slide_height = Inches(7.5)
    names = {0: '标题幻灯片', 1: '标题和内容', 2: '节标题', 3: '两栏内容',
             5: '仅标题', 6: '空白', 7: '结束页'}
    for index, name in names.items():
        layout = presentation.slide_layouts[index]
        layout.name = name
        for shape in layout.placeholders:
            kind = shape.placeholder_format.type
            if kind in (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE):
                if index in (0, 2, 7):
                    shape.left, shape.top = Inches(1.1), Inches(2.4)
                    shape.width, shape.height = Inches(11.1), Inches(1.25)
                else:
                    shape.left, shape.top = Inches(0.8), Inches(0.45)
                    shape.width, shape.height = Inches(11.7), Inches(0.9)
            elif kind == PP_PLACEHOLDER.SUBTITLE:
                shape.left, shape.top = Inches(1.15), Inches(3.85)
                shape.width, shape.height = Inches(10.8), Inches(0.7)
            elif kind in (PP_PLACEHOLDER.OBJECT, PP_PLACEHOLDER.BODY):
                if index in (2, 7):
                    shape.left, shape.top = Inches(1.1), Inches(4.0)
                    shape.width, shape.height = Inches(11.0), Inches(1.0)
                elif index == 3:
                    shape.left = Inches(0.8 if shape.placeholder_format.idx == 1 else 6.8)
                    shape.top = Inches(1.65)
                    shape.width, shape.height = Inches(5.75), Inches(5.1)
                else:
                    shape.left, shape.top = Inches(0.8), Inches(1.65)
                    shape.width, shape.height = Inches(11.7), Inches(5.1)
    with NamedTemporaryFile(suffix='.pptx') as temporary:
        presentation.save(temporary.name)
        with ZipFile(temporary.name) as source, ZipFile(OUTPUT, 'w') as target:
            for member in source.infolist():
                data = source.read(member.filename)
                if member.filename.startswith('ppt/theme/') and member.filename.endswith('.xml'):
                    data = edit_theme(data)
                member.date_time = (1980, 1, 1, 0, 0, 0)
                target.writestr(member, data)
    print(OUTPUT)


if __name__ == '__main__':
    main()
