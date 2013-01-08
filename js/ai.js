  function AI(factory)
  {
    if (!$.isFunction(factory))
      throw "Must pass a constructor to AI";

    var new_this = factory.call(this);

    if (!$.isFunction(new_this))
      throw "Factory must return a function for AI";

    new_this.is_ai = true

    return new_this
  }

  AI.test = function(f)
  {
    return !!f.is_ai
  }
