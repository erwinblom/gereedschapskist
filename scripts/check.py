#!/usr/bin/env python3
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import re,zipfile
root=Path(__file__).resolve().parent.parent
class Links(HTMLParser):
 def __init__(self,path):super().__init__();self.path=path
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  for key in ['src','href']:
   link=a.get(key,'');u=urlsplit(link)
   if not link or u.scheme or link.startswith(('#','/','data:')):continue
   target=self.path.parent/unquote(u.path)
   assert target.exists(),f'{self.path.relative_to(root)}: missing {link}'
for directory in [root/'app',root/'docs']:
 for p in directory.rglob('*.html'):Links(p).feed(p.read_text())
 start=(directory/'Begin hier.html').read_text();assert len(re.findall(r'<li class="card active">',start))==9
 assert 'Schrijfkamer' in start and '>Planner<' in start
for p in (root/'docs/Apps').glob('*/*.html'):
 if p.parent.name!='Werkbank':assert "KEY='gereedschapskist:" in p.read_text(),p
assert "'gereedschapskist:MarkdownWerkbankLocalV2'" in (root/'docs/Apps/Werkbank/Onderdelen/app.js').read_text()
with zipfile.ZipFile(root/'dist/Gereedschapskist.zip') as z:
 assert z.testzip() is None
 assert 'Gereedschapskist/Begin hier.html' in z.namelist()
 for p in (root/'app').rglob('*'):
  if p.is_file() and p.name!='.DS_Store':assert z.read('Gereedschapskist/'+str(p.relative_to(root/'app')))==p.read_bytes()
print('OK: alle lokale HTML-links, 9 tools, eigen webopslag en ZIP gelijk aan bron.')
