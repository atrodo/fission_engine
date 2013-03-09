var round = function(num)
{
  return (num + 0.5) | 0
}
var floor = function(num)
{
  return num | 0
}
var ceil = function(num)
{
  return (num | 0) == num ? num | 0 : (num + 1) | 0
}
var abs = Math.abs
var sqrt = Math.sqrt

var log = function(num)
{
  var result = Math.log(num)

  return result
}

var signed_log = function(num)
{
  var sign = num < 0 ? -1 : 1;

  var result = Math.log(abs(num))

  return sign * result
}

var max = function(a, b)
{
  return (a > b) ? a : b;
}

var min = function(a, b)
{
  return (a < b) ? a : b;
}

var compact_array = function(old_all)
{
  var new_all = []
  for (var obj in old_all)
  {
    if (old_all[obj] != undefined)
    {
      new_all.push(old_all[obj])
    }
  }
  return new_all;
}

var count_object_keys = function(obj)
{
  var result = 0;
  for (var prop in obj)
  {
    if (obj.hasOwnProperty(prop))
      result++
  }

  return result
}

var warn = function()
{
  console.log.apply(console, arguments)
}
