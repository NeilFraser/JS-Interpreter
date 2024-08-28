"""JS-Interpreter Polyfill Compiler

Copyright 2024 Neil Fraser

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

""" Process interpreter.tmp.js and compile the annotated polyfills.
"""

_author__ = "interpreter@neil.fraser.name (Neil Fraser)"

import json
import os
import re
import subprocess
import sys

if len(sys.argv) < 2:
  print("Usage: %s interpreter.tmp.js" % sys.argv[0])
  sys.exit(1)

filename = sys.argv[1]
print ("Processing %s..." % filename)
with open(filename, "r") as f:
  js = f.read()

polyfillCount = 0
while True:
  m1 = re.search(r"/\*\s*POLYFILL\s*START\s*\*/", js)
  m2 = re.search(r"/\*\s*POLYFILL\s*END\s*\*/", js)
  if not m1 and not m2:
    break
  if m1 and not m2:
    print("Error: Unterminated 'POLYFILL START' annotation.")
    sys.exit(1)
  if not m1 and m2:
    print("Error: Unexpected 'POLYFILL END' annotation.")
    sys.exit(1)
  if m1.span()[1] > m2.span()[0]:
    print("Error: 'POLYFILL END' annotation before 'POLYFILL START'.")

  polyfillCount += 1
  polyfill = js[m1.span()[1]:m2.span()[0]]
  print("Compressing polyfill #%d..." % polyfillCount)
  # Strip //-style comments.
  polyfill = re.sub(r"//[^\r\n]*[\r\n]", "\n", polyfill)
  array = json.loads("[%s]" % polyfill)
  code = "".join(array)

  with open("polyfill-raw.tmp.js", "w") as f:
    f.write(code)

  subprocess.run([
    "java",
    "-jar", "./compiler.jar",
    "--compilation_level", "SIMPLE_OPTIMIZATIONS",
    "--language_in=ECMASCRIPT5", "--language_out=ECMASCRIPT5",
    "--js='polyfill-raw.tmp.js'",
    "--js_output_file", "polyfill-comp.tmp.js"
  ])

  with open("polyfill-comp.tmp.js", "r") as f:
    code = f.read()

  os.remove("polyfill-raw.tmp.js")
  os.remove("polyfill-comp.tmp.js")

  code = code.strip()  # Trim trailing \n.
  code = json.dumps(code)
  js = js[:m1.span()[0]] + code + js[m2.span()[1]:]

with open(filename, "w") as f:
  f.write(js)
print("Compressed %d polyfills." % polyfillCount)
