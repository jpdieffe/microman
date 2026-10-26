"""Recover the original SF4 installer files without executing the installer.

Requires binary-refinery (PKWARE decompressor). Validate every member's CRC.
The SF4 shortcut records are variable length, so use source path records rather
than the later SF6 parser's fixed shortcut-record skip.
"""
from pathlib import Path, PureWindowsPath
import re
import struct
import zlib
import zipfile
from refinery.lib.fast.pkware import pkware_decompress

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.research' / 'original'
OUT.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(ROOT / 'assets' / 'microman-original.zip') as archive:
    data = archive.read('micro1s.com')
pos = data.index(bytes(range(0xe0, 0xe7))) + 7
count = data[pos]
pos += 1
script = None
for _ in range(count):
    name = data[pos:pos+16].split(b'\0')[0].decode()
    size, crc = struct.unpack_from('<II', data, pos+16)
    pos += 24
    raw = bytes(pkware_decompress(data[pos:pos+size]))
    assert zlib.crc32(raw) & 0xffffffff == crc, name
    pos += size
    if name == 'irsetup.dat':
        script = raw
assert script is not None
for match in re.finditer(rb'c:\\proj\\micro1\\final\\', script):
    path = script[match.start():match.start()+script[match.start()-1]]
    size, crc = struct.unpack_from('<II', script, match.start()-9)
    packed = data[pos:pos+size]
    raw = packed if zlib.crc32(packed) & 0xffffffff == crc else bytes(pkware_decompress(packed))
    assert zlib.crc32(raw) & 0xffffffff == crc, path
    name = PureWindowsPath(path.decode()).name.lower()
    (OUT / name).write_bytes(raw)
    print(name, len(raw), f'{crc:08x}')
    pos += size
assert pos == len(data), (pos, len(data))
