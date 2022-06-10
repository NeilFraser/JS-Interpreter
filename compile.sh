# Script for generating the compiled acorn_interpreter.js file.

# Download Closure Compiler if not already present.
if test -f "compiler.jar"; then
  echo "Found Closure Compiler."
else
  echo "Downloading Closure Compiler."
  wget -N https://unpkg.com/google-closure-compiler-java/compiler.jar
fi

# Compile Acorn (using simple optimizations so AST property names don't rename).
echo "Compiling Acorn..."
java -jar ./compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --language_in=ECMASCRIPT5 --language_out=ECMASCRIPT5 --js='acorn.js' --js_output_file acorn_compressed.js

# Compile JS-Interpreter (using advanced optimizations).
echo "Compiling JS-Interpreter..."
java -jar ./compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --language_in=ECMASCRIPT5 --language_out=ECMASCRIPT5 --js='interpreter.js' --js_output_file interpreter_compressed.js

# Assemble the pieces, along with shortened copyright statements.
echo "// Acorn: Copyright 2012 Marijn Haverbeke, MIT License" > acorn_interpreter.js
cat acorn_compressed.js >> acorn_interpreter.js
echo "// JS-Interpreter: Copyright 2013 Google LLC, Apache 2.0" >> acorn_interpreter.js
tail -n +6 interpreter_compressed.js >> acorn_interpreter.js

# Delete the part files.
rm acorn_compressed.js interpreter_compressed.js

echo "Done"
