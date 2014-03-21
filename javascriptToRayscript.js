var javascriptToRayscript = function (str) {
  var map = {
    'var': 'ray',
    'function': 'raySays',
    'if': 'ifRay',
    'else': 'elseRay',
    'for': 'forRay',
    'while': 'whileRay',
    'true': 'Ray',
    'false': 'notRay',
    'do': 'doRay',
    'return': 'returnRay',
    'throw': 'throwRay',
    'break': 'breakRay',
    'case': 'caseRay',
    'catch': 'catchRay',
    'continue': 'continueRay',
    'debugger': 'debuggerRay',
    'default': 'defaultRay',
    'switch': 'switchRay',
    'with': 'withRay',
    'null': 'nullRay',
    'instanceof': 'instanceofRay',
    'typeof': 'typeofRay',
    'new': 'newRay',
    'in': 'inRay',
    'this': 'him'
  };

  for (var key in map) {
    str = str.replace(key, map[key]);
  }
  console.log(str);
  return str;
};