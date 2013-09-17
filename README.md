# Bubbles

Bubbles lets you create types with that behave the same way as if you declared them in C++ or other full-featured OOP languages.

## Private Scope

One of the biggest annoyances with JavaScript is the lack of a private scope within an object. The longer the inheritance chain, the harder it is to come up with unique names, and the easier it is to clash names with a parent creating unexpected behavior. With Bubbles, we can give each object a private scope where it cannot be modified by the outside:

```js
var Car =
  bubbles.type().
    def({
      // public
      start: function() {
        this.turnKey();
        console.log( "car started" );
      },
      // private
      _turnKey: function() {
        console.log( "key turned" );
      }
    });

var car = new Car();
car.start();

// Car.turnKey is private and doesn't exist on the public interface
equal( car.turnKey, undefined );
```

When a type is instantiated, all methods are bound to a separate object known as the **private scope**. This object is different than the one returned by the constructor:

```js
var Foo =
  bubbles.type().
    def({
      self: function() {
        return this;
      }
    });
  
var foo = new Foo();
notEqual( foo.self(), foo );
```

The object returned by the constructor is known as the **public interface**. Public methods are made accessible via proxies on the interface. The interface can be accessed internally via the `_pub` member. Whenever a method returns
itself, it should always return its public interface, not the private scope:
```js
var Foo =
  bubbles.type().
    def({
      self: function() {
        return this._pub;
      }
    });
  
var foo = new Foo();
equal( foo.self(), foo );
```

Of course, we wouldn't have a working private scope unless we could somehow expose it to other instances. There are two ways a type can access the private members of another instance. The `_new` method creates a new instance of the type, but returns the private scope instead:

```js
var Foo =
  bubbles.type().
    def({
      bar: function() {
        // creates a new instance of Foo and calls its private method baz
        return this._new().baz();
      },
      _baz: function() {
        return "hello";
      }
    });
    
var foo = new Foo();
equal( foo.bar(), "hello" );
```

We can also call `_pry` to extract the private scope from an existing instance:

```js
var Money =
  bubbles.type().
    def({
      ctor: function( amount ) {
        this.amount = amount;
      },
      add: function( foo ) {
        return this.amount + this._pry( foo ).amount;
      }
    });

var a = new Money( 2 );
var b = new Money( 5 );
equal( a.add( b ), 7 );
```

## Inheritance

Types are allowed one base type. The coding style mimics John Resig's [Simple Javascript Inheritance](http://ejohn.org/blog/simple-javascript-inheritance/) library:

```js
var A =
  bubbles.type().
    def({
      $foo: function() {
        return "hello";
      }
    });
        
var B =
  bubbles.type().
    extend( A ).
    def({
      $foo: function() {
        return this._super() + " world";
      }
    });
        
var b = new B();
equal( b.foo(), "hello world" );
```

The `$` sign defines the method as **virtual**. This means that the method may be overridden in a child type. In traditional JavaScript inheritance, every method is virtual by default. This makes it very easy to accidentially override a parent method and break existing functionality. With Bubbles, virtual methods are not the default, and an error is thrown if a type attempts to redefine a method that was not defined virtual. Virtual methods may be **sealed** by simply taking out the `$` sign:

```js
// defines virtual method `foo`
var A = bubbles.type().def({ $foo: function() {} });

// overrides `foo` and seals it
var B = bubbles.type().extend( A ).def( foo: function() {} });

var C = bubbles.type().extend( B );

// error: foo has already been defined
throws( C.def( foo: function() {} }); )
```

Note: Bubbles does not support protected methods. This is mainly because I couldn't think of a prefix that would make sense, but also because I don't see a point. It doesn't aid in decluttering the namespace, and it's not like we have a nice intellisense window to keep neat and trimmed. If a method should be protected, then let's document it as such and not call it from the outside. ["We're all adults here."](https://mail.python.org/pipermail/tutor/2003-October/025932.html)
