import os
import tarfile

src = r'f:\DND\Kids Resources\data\5eTools\5etools-2014-w-img-1.214.4.tar.xz'
dst = r'f:\DND\Kids Resources\data\5eTools\extracted'

os.makedirs(dst, exist_ok=True)
with tarfile.open(src, 'r:xz') as tf:
    tf.extractall(dst)
print('Extracted', len(tf.getmembers()), 'members into', dst)
