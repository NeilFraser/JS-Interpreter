# Script for generating the compiled acorn_interpreter.js file.

# Download Closure Compiler if not already present.
if test -f "compiler.jar"; then
  echo "Found Closure Compiler."
else
  echo "Downloading Closure Compiler."
  wget -N https://unpkg.com/google-closure-compiler-java/compiler.jar
  if test -f "compiler.jar"; then
    echo "Downloaded Closure Compiler."
  else
    echo "Unable to download Closure Compiler."
    exit 1
  fi
fi

echo "Compiling Acorn + JS-Interpreter..."
java -jar ./compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --language_in=ECMASCRIPT5 --language_out=ECMASCRIPT5 --warning_level VERBOSE --js='acorn.js' --js='interpreter.js' --js_output_file acorn_interpreter.js

echo "Done"
