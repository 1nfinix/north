"""Shared PowerPoint input and placeholder helpers."""

from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile, BadZipFile
import re
import xml.etree.ElementTree as ET

from pptx import Presentation
from pptx.exc import PackageNotFoundError
from lxml.etree import XMLSyntaxError
from pptx.enum.shapes import PP_PLACEHOLDER

P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
TEMPLATE_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.template.main+xml'
PRESENTATION_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'
TEXT_TYPES = {PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE, PP_PLACEHOLDER.SUBTITLE,
              PP_PLACEHOLDER.BODY, PP_PLACEHOLDER.OBJECT, PP_PLACEHOLDER.VERTICAL_BODY}
CONTENT_TYPES = {PP_PLACEHOLDER.BODY, PP_PLACEHOLDER.OBJECT, PP_PLACEHOLDER.CHART,
                 PP_PLACEHOLDER.TABLE, PP_PLACEHOLDER.PICTURE}


@contextmanager
def open_deck(path):
    """Open a presentation or convert a template main content type in a temporary copy."""
    path = Path(path)
    if not path.is_file():
        raise ValueError(f'文件不存在：{path}，请检查路径。')
    if path.suffix.lower() not in ('.pptx', '.potx'):
        raise ValueError('只支持 .pptx 或 .potx 文件。')
    if path.suffix.lower() == '.pptx':
        try:
            deck = Presentation(str(path))
        except (PackageNotFoundError, BadZipFile, XMLSyntaxError) as error:
            raise ValueError(f'无法读取 PPT 文件：{path}，请检查文件是否损坏。') from error
        yield deck
        return
    with TemporaryDirectory() as directory:
        converted = Path(directory) / 'template.pptx'
        try:
            source = ZipFile(path)
        except BadZipFile as error:
            raise ValueError(f'无法读取模板：{path}，请检查文件是否损坏。') from error
        with source, ZipFile(converted, 'w') as target:
            for member in source.infolist():
                data = source.read(member.filename)
                if member.filename == '[Content_Types].xml':
                    root = ET.fromstring(data)
                    found = False
                    for item in root.findall(f'{{{CT}}}Override'):
                        if item.get('PartName') == '/ppt/presentation.xml':
                            if item.get('ContentType') != TEMPLATE_TYPE:
                                raise ValueError('.potx 的主内容类型不是模板，请检查文件。')
                            item.set('ContentType', PRESENTATION_TYPE)
                            found = True
                    if not found:
                        raise ValueError('.potx 缺少演示文稿主内容类型。')
                    data = ET.tostring(root, encoding='utf-8', xml_declaration=True)
                target.writestr(member, data)
        try:
            deck = Presentation(str(converted))
        except (PackageNotFoundError, BadZipFile, XMLSyntaxError) as error:
            raise ValueError(f'无法读取转换后的模板：{path}，请检查文件。') from error
        yield deck


def placeholders(slide):
    """Return placeholders in layout order, including inherited title slots."""
    return list(slide.placeholders)


def remove_shape(shape):
    element = shape._element
    element.getparent().remove(element)


def match_layout(presentation, value):
    layouts = list(presentation.slide_layouts)
    if type(value) is int and 0 <= value < len(layouts):
        return layouts[value]
    if isinstance(value, str):
        for layout in layouts:
            if layout.name == value:
                return layout
        normalized = re.sub(r'\s+', '', value).casefold()
        for layout in layouts:
            if re.sub(r'\s+', '', layout.name).casefold() == normalized:
                return layout
    names = '、'.join(f'{i}: {layout.name}' for i, layout in enumerate(layouts))
    raise ValueError(f'找不到版式 {value!r}。可用版式：{names}')


def theme_info(presentation):
    """Read the current master's theme metadata from its OPC part."""
    try:
        theme = presentation.slide_master.part.part_related_by('http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme')
        root = ET.fromstring(theme.blob)
    except (KeyError, AttributeError, ET.ParseError):
        return {'fonts': {}, 'colors': {}}
    ns = {'a': A}
    fonts = {}
    scheme = root.find('.//a:themeElements/a:fontScheme', ns)
    if scheme is not None:
        for key, tag in [('title', 'majorFont'), ('body', 'minorFont')]:
            font = scheme.find(f'a:{tag}', ns)
            if font is None:
                continue
            latin = font.find('a:latin', ns)
            east = font.find("a:ea", ns)
            han = font.find("a:font[@script='Hans']", ns)
            fonts[key] = {'latin': latin.get('typeface', '') if latin is not None else '',
                          'eastAsia': (east.get('typeface', '') if east is not None else '') or
                          (han.get('typeface', '') if han is not None else '')}
    colors = {}
    scheme = root.find('.//a:themeElements/a:clrScheme', ns)
    if scheme is not None:
        for child in scheme:
            color = next(iter(child), None)
            if color is not None:
                colors[child.tag.split('}')[-1]] = color.get('val', '') or color.get('lastClr', '')
    return {'fonts': fonts, 'colors': colors}
