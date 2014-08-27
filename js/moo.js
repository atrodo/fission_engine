/*
  new
  BUILDARGS
  BUILD
  does

  extends
  with
  has
    is
    isa
    coerce
    handles
    trigger
    default
    predicate
    builder
    clearer
    lazy
    required
    reader
    writer
    weak_ref...
    init_arg
  before
  around
  after


  ROLE
  has
*/

(function(window)
{
  var Moo = function() { };

  var isFunction = function(func)
  {
    return typeof func === "function";
  }
  var simple_default = function(value)
  {
    return function() { return value };
  }

  var die = function(msg) { console.trace(); throw msg };

  Moo.extends = function () { die() };
  Moo.with = function () { die() };
  Moo.has = function (prop_name, attr)
  {

    var desc = {
      configurable: false,
      enumerable: true,
    }

    // * is
    attr.is = attr.is.toLowerCase();
    if (!(attr.is == 'rw' || attr.is == 'ro'))
    {
      die( "Moo: 'is' must be rw or ro: '" + prop_name + "' was '" +
            attr.is + "'" );
    }

    desc.rw = attr.is == 'rw';

    // * lazy
    desc.lazy = 'lazy' in attr ? !!attr.lazy : false;

    // * coerce
    if ('coerce' in attr)
    {
      if (typeof attr.coerce != "function")
      {
        die("Moo: attribute defaults must be a function or simple type");
      }
      desc.coerce = attr.coerce;
    }

    // * default
    if ('default' in attr)
    {
      var default_typeof = typeof attr.default;

      // We only accept simple, immutable types
      if ( default_typeof == "boolean"
        || default_typeof == "number"
        || default_typeof == "string"
        || default_typeof == "undefined"
        || attr.default === null
        )
      {
        attr.default = simple_default(attr.default);
      }

      if (typeof attr.default != "function")
      {
        die("Moo: attribute defaults must be a function or simple type");
      }

      desc.default = attr.default;
    }


    //
    /*
    * isa
    * handles
    * trigger
    * predicate
    * builder
    * clearer
    * required
    * reader
    * writer
    * weak_ref...
    * init_arg
    */

    this._new.props[prop_name] = desc;
  };

  Moo.method = function (name, body)
  {
    if (!isFunction(body))
    {
      die("Method must be a function");
    }

    this._new.methods[name] = body;
  };

  Moo.before = function (name, body) { die() };
  Moo.around = function (name, body) { die() };
  Moo.after = function (name, body) { die() };

  Moo.class = function(class_def)
  {
    var meta = Object.create(Moo);
    var _new = {};

    var props = {};

    var new_class = function(values)
    {
      if (isFunction(this.BUILDARGS))
      {
        values = this.BUILDARGS.apply(this, arguments);
      }

      if (values === undefined)
      {
        values = {}
      }

      if (typeof values != 'object')
      {
        die("Moo: constructor requires an object of values");
      }

      var backend = {}
      for (prop_name in props)
      {
        (function()
        {
          var prop = prop_name;
          var desc = props[prop];

          var real_getter = function() { return backend[prop] };

          var getter = real_getter;
          var setter;

          var has_done_lazy = false;

          if ('coerce' in desc)
          {
            setter = function(new_value)
            {
              has_done_lazy = true;
              backend[prop] = desc.coerce.call(this, new_value);
            }
          }
          else
          {
            setter = function(new_value)
            {
              has_done_lazy = true;
              backend[prop] = new_value
            }
          }

          if (prop in values)
          {
            setter.call(this, values[prop]);
          }
          else
          {
            if (desc.lazy)
            {
              getter = function()
              {
                if (!has_done_lazy)
                {
                  backend[prop] = desc.default.call(this);
                  has_done_lazy = true;
                }

                return real_getter()
              }
            }
            else
            {
              backend[prop] = desc.default.call(this);
            }
          }

          //
          Object.defineProperty(this, prop, {
            configurable: false,
            enumerable: true,
            get: getter,
            set: desc.rw ? setter : undefined,
          });
        }).call(this);
      };

      Object.seal(this);
    };

    _new = {
      methods: new_class.prototype,
      props: props,
      c: new_class,
    };

    meta._new = _new;

    if (class_def instanceof Function)
    {
      class_def.call(meta);
    }

    return new_class;
  }

  window.Moo = Moo;
})(window);
