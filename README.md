# Bubbles

Bubbles lets you create types with that behave the same way as if you declared them in C++ or other full-featured OOP languages.

## Private Scope

One of the biggest annoyances with JavaScript is the lack of a private scope within an object. The longer the inheritance chain, the harder it is to come up with unique names for things, and the easier it is to clash names with a parent class creating unexpected behavior. With Bubbles, we can give each object a private scope where it cannot be modified by the outside:

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
