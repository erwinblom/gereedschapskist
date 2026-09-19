#!/usr/bin/env python3
"""Build the website and download from the same app source. Python standard library only."""
from pathlib import Path
import shutil,re,zipfile,hashlib,subprocess,sys
ROOT=Path(__file__).resolve().parent.parent
subprocess.run([sys.executable,str(ROOT/'scripts/build-link-bewaren.py')],check=True)
source=ROOT/'app';web=ROOT/'docs';dist=ROOT/'dist'
if web.exists():shutil.rmtree(web)
shutil.copytree(source,web,ignore=shutil.ignore_patterns('.DS_Store'))
# GitHub Pages project sites share an origin. Namespace the website cache to
# avoid accidental collisions with other Erwin Blom tools; JSON stays portable.
keys=['ping-local-v1','projectbord-v1','bronnenkast-v1','uren-v1','contacten-v1','publicatieplanner-v1','offerte-v1','kasboek-v1','MarkdownWerkbankLocalV2','converterFiles','theme','lastOpenFile','sidebarWidth','mw-project','mw-folders-','mw-document-','mw-start-','ping-finalize-v2']
for file in web.rglob('*'):
 if file.suffix not in ('.html','.js') or 'vendor' in file.parts:continue
 text=file.read_text()
 for key in keys:
  for quote in ["'",'"']:
   text=text.replace(quote+key+quote,quote+'gereedschapskist:'+key+quote)
 file.write_text(text)
# Keep the development notice on the website, outside the offline download.
homepage=web/'Begin hier.html'
notice_style='<style>.work-notice{margin:18px 0 0;padding:14px 18px;border-left:6px solid #e32720;background:#111;color:#fff;font:16px/1.5 Arial,Helvetica,sans-serif}.work-notice strong{display:block;font-size:20px;text-transform:uppercase;letter-spacing:.4px}</style>'
notice='<aside class="work-notice" aria-label="Werk in uitvoering"><strong>Werk in uitvoering!</strong>Aan deze site wordt nog voortdurend gesleuteld.</aside>'
homepage.write_text(homepage.read_text().replace('</head>',notice_style+'</head>').replace('<main>','<main>'+notice,1))
(web/'index.html').write_text(homepage.read_text())
(web/'.nojekyll').touch()
dist.mkdir(exist_ok=True)
with zipfile.ZipFile(dist/'Gereedschapskist.zip','w',zipfile.ZIP_DEFLATED) as archive:
 for file in sorted(source.rglob('*')):
  if file.is_file() and file.name!='.DS_Store':archive.write(file,Path('Gereedschapskist')/file.relative_to(source))
with zipfile.ZipFile(dist/'Gereedschapskist.zip') as archive:assert archive.testzip() is None
(dist/'SHA256SUMS.txt').write_text(hashlib.sha256((dist/'Gereedschapskist.zip').read_bytes()).hexdigest()+'  Gereedschapskist.zip\n')
print('Gebouwd: docs/ en dist/Gereedschapskist.zip')
