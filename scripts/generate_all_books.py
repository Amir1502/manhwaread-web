# -*- coding: utf-8 -*-
"""
Full Book Database Generator for 11th Grade Russian Final Essay.
Populates data/books/*.json and data/books/index.json.
"""

import os
import sys
import json
import re
import time
import urllib.request
import urllib.parse
from html.parser import HTMLParser

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOKS_DIR = os.path.join(ROOT_DIR, 'data', 'books')
os.makedirs(BOOKS_DIR, exist_ok=True)

class HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paragraphs = []
        self.current = []
        self.skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'table'):
            self.skip = True
        if tag in ('p', 'div') and not self.skip:
            if self.current:
                p = ' '.join(self.current).strip()
                if p:
                    self.paragraphs.append(p)
                self.current = []

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'table'):
            self.skip = False
        if tag in ('p', 'div') and not self.skip:
            if self.current:
                p = ' '.join(self.current).strip()
                if p:
                    self.paragraphs.append(p)
                self.current = []

    def handle_data(self, data):
        if not self.skip:
            cleaned = data.strip()
            if cleaned:
                self.current.append(cleaned)

def extract_html_paragraphs(html):
    parser = HTMLTextExtractor()
    parser.feed(html)
    if parser.current:
        p = ' '.join(parser.current).strip()
        if p:
            parser.paragraphs.append(p)
    # Filter out empty or navigational paragraphs
    result = []
    for p in parser.paragraphs:
        p = re.sub(r'\s+', ' ', p).strip()
        if len(p) > 20 and not p.startswith('{{') and not p.startswith('[['):
            result.append(p)
    return result

def fetch_url(url, is_json=False):
    headers = {'User-Agent': 'ManhwaReadEssayBot/1.0 (educational final essay project; amir@example.com)'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read()
            try:
                decoded = raw.decode('utf-8')
            except UnicodeDecodeError:
                decoded = raw.decode('windows-1251', errors='replace')
            if is_json:
                return json.loads(decoded)
            return decoded
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def split_raw_into_paragraphs(text):
    if not text:
        return []
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    # Remove BOM if present
    if text.startswith('\ufeff'):
        text = text[1:]
    raw_paras = text.split('\n\n')
    paras = []
    for p in raw_paras:
        cleaned = ' '.join(line.strip() for line in p.split('\n') if line.strip())
        if cleaned:
            # Clean weird OCR artefacts if any
            cleaned = re.sub(r'[\t\r]+', ' ', cleaned).strip()
            if len(cleaned) > 0:
                paras.append(cleaned)
    return paras

print("Helper functions ready.")
