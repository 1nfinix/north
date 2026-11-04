"""End-to-end checks for the bundled PowerPoint scripts with the pinned Office Python."""

import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest
from zipfile import ZipFile
from xml.etree import ElementTree as ET

from pptx import Presentation
from pptx.enum.shapes import PP_PLACEHOLDER
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_LABEL_POSITION, XL_LEGEND_POSITION
from pptx.enum.text import MSO_ANCHOR
from pptx.util import Inches
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'assets/ppt-report'
SCRIPTS = ROOT / 'scripts'
TEMPLATE = ROOT / 'assets/default-template.pptx'


class PptReportTest(unittest.TestCase):
    def setUp(self):
        self.temporary = TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.work = Path(self.temporary.name)

    def run_script(self, name, *args):
        return subprocess.run([sys.executable, str(SCRIPTS / name), *(str(arg) for arg in args)],
                              cwd=self.work, capture_output=True, text=True, check=False)

    def write_plan(self, slides):
        path = self.work / 'plan.json'
        path.write_text(json.dumps({'slides': slides}, ensure_ascii=False), encoding='utf-8')
        return path

    def test_default_theme_uses_north_fonts_and_colors(self):
        with ZipFile(TEMPLATE) as package:
            theme = package.read('ppt/theme/theme1.xml')
        self.assertNotIn(b'ns0:', theme)
        root = ET.fromstring(theme)
        ns = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
        scheme = root.find('.//a:clrScheme', ns)
        self.assertEqual(scheme.get('name'), 'North')
        self.assertEqual(scheme.find('a:accent1/a:srgbClr', ns).get('val'), '1F6F6B')
        self.assertEqual(scheme.find('a:dk1/a:sysClr', ns).get('val'), 'windowText')
        self.assertEqual(scheme.find('a:lt1/a:sysClr', ns).get('val'), 'window')
        for tag in ('majorFont', 'minorFont'):
            font = root.find(f'.//a:fontScheme/a:{tag}', ns)
            self.assertEqual(font.find('a:latin', ns).get('typeface'), 'Arial')
            self.assertEqual(font.find('a:ea', ns).get('typeface'), 'Microsoft YaHei')
            self.assertEqual(font.find("a:font[@script='Hans']", ns).get('typeface'), 'Microsoft YaHei')
        self.assertNotIn(b'Aptos', theme)

    def test_chart_labels_legend_gridlines_and_source(self):
        slides = [
            {'layout': '标题和内容', 'title': '单系列', 'chart': {
                'type': 'column', 'title': '指标持续增长', 'categories': ['第一项', '第二项'],
                'series': [{'name': '数值', 'values': [12, 18]}], 'source': '来源：示例数据'}},
            {'layout': '标题和内容', 'title': '多系列', 'chart': {
                'type': 'line', 'categories': ['第一项', '第二项'],
                'series': [{'name': '甲', 'values': [12, 18]}, {'name': '乙', 'values': [9, 14]}]}},
        ]
        output = self.work / 'charts.pptx'
        result = self.run_script('fill_template.py', TEMPLATE, self.write_plan(slides), output)
        self.assertEqual(result.returncode, 0, result.stderr)
        deck = Presentation(output)
        single = next(shape.chart for shape in deck.slides[0].shapes if shape.has_chart)
        multi = next(shape.chart for shape in deck.slides[1].shapes if shape.has_chart)
        self.assertTrue(single.plots[0].has_data_labels)
        self.assertTrue(single.plots[0].data_labels.show_value)
        self.assertEqual(single.plots[0].data_labels.position, XL_LABEL_POSITION.OUTSIDE_END)
        self.assertFalse(single.has_legend)
        self.assertEqual(single.chart_title.text_frame.paragraphs[0].font.size.pt, 14)
        self.assertTrue(single.chart_title.text_frame.paragraphs[0].font.bold)
        self.assertTrue(multi.has_legend)
        self.assertEqual(multi.legend.position, XL_LEGEND_POSITION.BOTTOM)
        self.assertTrue(multi.plots[0].has_data_labels)
        self.assertEqual(multi.plots[0].data_labels.position, XL_LABEL_POSITION.ABOVE)
        self.assertEqual(single.value_axis.major_gridlines.format.line.color.rgb, RGBColor(0xD9, 0xD9, 0xD9))
        self.assertFalse(single.value_axis.has_minor_gridlines)
        source = next(shape for shape in deck.slides[0].shapes if shape.name == 'ppt-report source')
        self.assertEqual(source.text_frame.paragraphs[0].font.color.rgb, RGBColor(0x7F, 0x7F, 0x7F))

    def test_pie_labels_show_category_and_percentage(self):
        output = self.work / 'pie.pptx'
        plan = self.write_plan([{'layout': '标题和内容', 'title': '占比', 'chart': {
            'type': 'pie', 'categories': ['第一项', '第二项'],
            'series': [{'name': '份额', 'values': [40, 60]}]}}])
        result = self.run_script('fill_template.py', TEMPLATE, plan, output)
        self.assertEqual(result.returncode, 0, result.stderr)
        chart = next(shape.chart for shape in Presentation(output).slides[0].shapes if shape.has_chart)
        self.assertFalse(chart.has_legend)
        self.assertTrue(chart.plots[0].data_labels.show_percentage)
        self.assertTrue(chart.plots[0].data_labels.show_category_name)

    def test_inspect_and_potx(self):
        result = self.run_script('inspect_template.py', TEMPLATE, '--json')
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(result.stdout)
        self.assertEqual(data['example_slides'], 0)
        self.assertEqual(data['theme']['fonts']['title']['eastAsia'], 'Microsoft YaHei')
        for name in ('标题幻灯片', '节标题', '标题和内容', '两栏内容', '仅标题', '结束页'):
            self.assertIn(name, [layout['name'] for layout in data['layouts']])
        potx = self.work / 'generic.potx'
        with ZipFile(TEMPLATE) as source, ZipFile(potx, 'w') as target:
            for member in source.infolist():
                value = source.read(member.filename)
                if member.filename == '[Content_Types].xml':
                    value = value.replace(b'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml',
                                          b'application/vnd.openxmlformats-officedocument.presentationml.template.main+xml')
                target.writestr(member, value)
        self.assertEqual(self.run_script('inspect_template.py', potx, '--json').returncode, 0)
        result = self.run_script('fill_template.py', potx,
                                 self.write_plan([{'layout': '标题幻灯片', 'title': '通用汇报'}]),
                                 self.work / 'from-potx.pptx')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(Presentation(self.work / 'from-potx.pptx').slides), 1)

    def test_fill_extract_round_trip_and_old_slide_removal(self):
        source = Presentation(TEMPLATE)
        source.slides.add_slide(source.slide_layouts[0]).shapes.title.text = '旧示例页'
        old = self.work / 'with-example.pptx'
        source.save(old)
        image = self.work / 'photo.png'
        Image.new('RGB', (160, 90), '#334155').save(image)
        slides = [
            {'layout': '标题幻灯片', 'title': '通用季度汇报', 'subtitle': '××'},
            {'layout': '标题和内容', 'title': '指标持续增长', 'bullets': ['第一项', {'text': '第二项', 'level': 1}], 'notes': '讲解记录'},
            {'layout': '标题和内容', 'title': '季度趋势', 'chart': {'type': 'column', 'title': '季度数据',
                'categories': ['一季度', '二季度', '三季度'], 'series': [{'name': '数值', 'values': [120, 128, 143]}]}},
            {'layout': '两栏内容', 'title': '事项进度', 'bullets': ['已完成'],
             'table': {'columns': ['事项', '进度'], 'rows': [['××', '80%']]}},
            {'layout': '仅标题', 'title': '配图', 'image': 'photo.png'},
        ]
        first = self.work / 'first.pptx'
        result = self.run_script('fill_template.py', old, self.write_plan(slides), first)
        self.assertEqual(result.returncode, 0, result.stderr)
        deck = Presentation(first)
        self.assertEqual(len(deck.slides), 5)
        with ZipFile(first) as package:
            parts = [name for name in package.namelist() if name.startswith('ppt/slides/slide') and name.endswith('.xml')]
        self.assertEqual(len(parts), 5)
        self.assertTrue(all(shape.text for slide in deck.slides for shape in slide.shapes if shape.is_placeholder and shape.has_text_frame))
        self.assertFalse(any('旧示例页' in shape.text for slide in deck.slides for shape in slide.shapes if shape.has_text_frame))
        self.assertEqual(deck.slides[0].shapes.title.text, '通用季度汇报')
        self.assertEqual(deck.slides[1].placeholders[1].text_frame.paragraphs[1].level, 1)
        self.assertEqual(deck.slides[2].shapes.title.placeholder_format.type, PP_PLACEHOLDER.TITLE)
        self.assertEqual(list(next(shape.chart for shape in deck.slides[2].shapes if shape.has_chart).series[0].values), [120, 128, 143])
        table = next(shape.table for shape in deck.slides[3].shapes if shape.has_table)
        self.assertTrue(all(row.height <= Inches(0.5) for row in table.rows))
        for row in table.rows:
            for cell in row.cells:
                self.assertEqual(cell.vertical_anchor, MSO_ANCHOR.MIDDLE)
                self.assertEqual(cell.text_frame.paragraphs[0].font.size.pt, 14)
        extracted = self.work / 'extracted'
        self.assertEqual(self.run_script('extract_deck.py', first, extracted).returncode, 0)
        plan = json.loads((extracted / 'plan.json').read_text(encoding='utf-8'))
        self.assertEqual([slide['title'] for slide in plan['slides']], [slide['title'] for slide in slides])
        self.assertEqual(plan['slides'][1]['bullets'], slides[1]['bullets'])
        self.assertEqual(plan['slides'][2]['chart']['series'][0]['values'], [120, 128, 143])
        self.assertEqual(plan['slides'][3]['table'], slides[3]['table'])
        self.assertEqual(plan['slides'][1]['notes'], '讲解记录')
        self.assertTrue((extracted / plan['slides'][4]['image']).is_file())
        self.assertTrue(json.loads((extracted / 'shapes.json').read_text())['slides'][0]['shapes'][0]['shape_id'])
        second = self.work / 'second.pptx'
        self.assertEqual(self.run_script('fill_template.py', TEMPLATE, extracted / 'plan.json', second).returncode, 0)
        self.assertEqual(len(Presentation(second).slides), 5)

    def test_overflow_unfilled_unknown_layout_and_bad_input(self):
        title = '很长的标题' * 100
        plan = self.write_plan([{'layout': '标题和内容', 'title': title, 'bullets': ['正文' * 500]},
                                {'layout': '标题和内容', 'title': '单内容区', 'bullets': ['要点'],
                                 'chart': {'type': 'line', 'categories': ['一'],
                                           'series': [{'name': '数值', 'values': [1]}]}}])
        result = self.run_script('fill_template.py', TEMPLATE, plan, self.work / 'overflow.pptx')
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn('自动缩小', result.stdout)
        self.assertIn('超出：', result.stdout)
        self.assertIn('未填入：chart', result.stdout)
        self.assertEqual(len(Presentation(self.work / 'overflow.pptx').slides), 2)
        bad = self.write_plan([{'layout': '不存在', 'title': '标题'}])
        result = self.run_script('fill_template.py', TEMPLATE, bad, self.work / 'bad.pptx')
        self.assertEqual(result.returncode, 1)
        self.assertIn('可用版式', result.stderr)
        self.assertEqual(self.run_script('fill_template.py', TEMPLATE, self.work / 'missing.json', self.work / 'bad.pptx').returncode, 1)
        bad.write_text('{', encoding='utf-8')
        self.assertIn('JSON 格式错误', self.run_script('fill_template.py', TEMPLATE, bad, self.work / 'bad.pptx').stderr)
        bad.write_text('{"slides":[{"layout":"仅标题","bullets":5}]}', encoding='utf-8')
        self.assertIn('bullets 必须是数组', self.run_script('fill_template.py', TEMPLATE, bad, self.work / 'bad.pptx').stderr)


if __name__ == '__main__':
    unittest.main()
