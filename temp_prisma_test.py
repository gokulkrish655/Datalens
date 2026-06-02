from pathlib import Path
import tempfile
import subprocess
import os

schema = '''generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
}

enum Plan { STARTER PRO ENTERPRISE }
'''

fd, path = tempfile.mkstemp(suffix='.prisma', text=True)
os.write(fd, schema.encode('utf-8'))
os.close(fd)
print('temp schema', path)
proc = subprocess.run(['npx', '--yes', 'prisma', 'validate', '--schema', path], capture_output=True, text=True)
print('returncode', proc.returncode)
print(proc.stdout)
print(proc.stderr)
