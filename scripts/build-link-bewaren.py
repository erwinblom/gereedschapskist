#!/usr/bin/env python3
"""Package the separate local extension; never touches the original Link Bewaren."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parent.parent
source=root/'extensies/link-bewaren-lokaal'
target=root/'app/Downloads/Link-Bewaren-lokaal.zip'
target.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(source.iterdir()):
        if file.is_file() and not file.name.startswith('.'):
            info=zipfile.ZipInfo('Link-Bewaren-lokaal/'+file.name, date_time=(2026,9,19,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED
            archive.writestr(info,file.read_bytes())
print('Gebouwd: aparte lokale Link Bewaren-extensie')
