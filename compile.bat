@REM Script for generating the compiled acorn_interpreter.js file.
@REM For Windows.

@REM  Prerequisites:
@REM  1. Ensure Java is installed.  Open a command prompt and type 'java'.
@REM  2. Ensure Python is installed.  Open a command prompt and type 'python'.
@REM  3. Use a web browser to download the compiler and place it in this directory.
@REM     https://unpkg.com/google-closure-compiler-java/compiler.jar

@REM  Open a command prompt in this directory and run this file (compile.bat).

@REM Make a copy of the interpreter so that polyfill sources can be complied.
copy interpreter.js interpreter.tmp.js

@REM This step is optional, but reduces the output by 5 KB.
python polyfill_compile.py interpreter.tmp.js

@ECHO Compiling Acorn + JS-Interpreter...
java -jar compiler.jar ^
     --compilation_level ADVANCED_OPTIMIZATIONS ^
     --language_in=ECMASCRIPT5 ^
     --language_out=ECMASCRIPT5 ^
     --warning_level VERBOSE ^
     --js='acorn.js' --js='interpreter.tmp.js' ^
     --js_output_file acorn_interpreter.js

del interpreter.tmp.js
@ECHO Done
