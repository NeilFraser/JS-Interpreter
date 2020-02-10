# Changelog

**Disclaimer:** This changelog is not created by the original author of JS
Interpreter, instead it is created by examining the changes made to the
original repo of JS-Interpreter, to identify new features, bug fixes and
breaking changes.

The version is chosen based on the type of changes according to the
[semver](https://semver.org/) guidelines.

## [2.1.0] - 2020-02-10

Commit: [28ba7f2](https://github.com/NeilFraser/JS-Interpreter/tree/28ba7f2)

### Added

- Non-constructable functions don’t have .prototype
  - Previously escape.prototype was set to undefined.  Now it is not defined.
- Add self-interpreter demo.

### Fixed

- Use iteration (not recursion) for polyfill steps.
- Revert "Remove unneeded error class"
  - Resovles #177
- Fix alert(true.toString())
  - Previously booleans and strings (but not numbers) would return ‘undefined’.
- Fix String and Number constructors with no arg.
  - Previously alert(Number()) -> NaN and alert(String()) -> ‘undefined’.
- Move constructor creation into createFunctionBase_
  - Fixes #175

### Removed

- Remove ancient constants.

## [2.0.0] - 2020-02-10

Commit: [d6809ac](https://github.com/NeilFraser/JS-Interpreter/tree/d6809ac)

- Initial version created from the original repo
