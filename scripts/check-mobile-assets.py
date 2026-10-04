"""Reject broken local entry-point paths before packaging a mobile build."""
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


class Assets(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        ref = attrs.get('src') if tag == 'script' else attrs.get('href') if tag == 'link' else None
        if ref:
            url = urlsplit(ref)
            assert not url.scheme and not url.netloc, f'External startup asset: {ref}'
            assert not url.path.startswith('/'), f'Non-relative startup asset: {ref}'
            assert (root / url.path).is_file(), f'Missing startup asset: {ref}'


root = Path(sys.argv[1])
Assets().feed((root / 'index.html').read_text())
assert (root / 'pdf.worker.min.mjs').is_file(), 'Missing PDF worker'
print('Mobile startup assets verified')
