module( "bubbles.type" );

test( "private methods are hidden", function()
{
    var Foo = bubbles.type().
        def({
            _bar: function() { }
        });

    var foo = new Foo();
    equal( foo.bar, undefined );
});

test( "methods cannot be defined more than once", function()
{
    var Foo = bubbles.type().
        def({
            bar: function() {}
        });

    throws( function()
    {
        Foo.def({
            bar: function() {}
        });
    });
});

test( "private methods can be called from public methods", function()
{
    var Foo = bubbles.type().
        def({
            bar: function( message ) {
                return this.baz( message + " world" );
            },
            _baz: function( message ) {
                return message + "!";
            }
        });

    var foo = new Foo();
    equal( foo.bar( "hello" ), "hello world!" );
});

test( "this._pub returns the object as the world sees it", function()
{
    var Foo = bubbles.type().
        def({
            bar: function() {
                return this._pub;
            }
        });

    var foo = new Foo();
    equal( foo.bar(), foo );
});

test( "non virtual methods are not overridable", function()
{
    var A = bubbles.type().
        def({
            foo: function() { }
        });

    var B = bubbles.type().extend( A );

    throws( function()
    {
        B.def({
            foo: function() { }
        });
    });
});

test( "methods from the parent are callable from the child", function()
{
    var A = bubbles.type().
        def({
            foo: function() {
                return "hello";
            }
        });

    var B = bubbles.type().
        extend( A ).
        def({
            bar: function() {
                return " world!";
            }
        });
    
    var b = new B();
    equal( b.foo() + b.bar(), "hello world!" );
});

test( "this._super calls parent method", function()
{
    var A = bubbles.type().
        def({
            $foo: function( message ) {
                return message + " world";
            }
        });

    var B = bubbles.type().
        extend( A ).
        def({
            $foo: function( message ) {
                return this._super( message ) + "!";
            }
        });

    var b = new B();
    equal( b.foo( "hello" ), "hello world!" );
});

test( "private methods don't overwrite each other", function()
{
    var A = bubbles.type().
        def({
            foo: function() {
                return this.bar();
            },
            _bar: function() {
                return "hello";
            }
        });

    var B = bubbles.type().
        extend( A ).
        def({
            baz: function() {
                return this.foo() + this.bar();
            },
            _bar: function() {
                return " world!";
            }
        });

    var b = new B();
    equal( b.baz(), "hello world!" );
});

test( "virtual methods can be sealed", function()
{
    var A = bubbles.type().
        def({
            $foo: function() { }
        });

    var B = bubbles.type().
        extend( A ).
        def({
            foo: function () {}
        });

    var C = bubbles.type().extend( B );

    throws( function()
    {
        C.def({
            foo: function() { }
        });
    });
});

test( "parent parameterless constructor gets called", function()
{
    var A = bubbles.type().
        def({
            ctor: function() {
                i += 2;
            }
        });

    var B = bubbles.type().
        extend( A ).
        def({
            ctor: function() {
                i += 3;
            }
        });

    var i = 0;
    var b = new B();
    equal( i, 5 );
});

test( "type instantiation fails because parent constructor contains parameters and child constructor does not explicitly call it", function()
{
    var A = bubbles.type().
        def({
            ctor: function( arg ) { }
        });

    var B = bubbles.type()
        .extend( A )
        .def({
            ctor: function() { }
        });

    throws( function()
    {
        var b = new B();
    });
});

test( "parent parameterless constructor gets called before child constructor", function() 
{
    var A = bubbles.type().
        def({
            ctor: function() {
                message += "hello";
            }
        });

    var B = bubbles.type().
        extend( A ).
        def({
            ctor: function( punctuation ) {
                message += " world" + punctuation;
            }
        });

    var message = "";
    var b = new B( "!" );
    equal( message, "hello world!" );
});

test( "parent constructor with parameters is not automatically called before child constructor", function()
{
    var A = bubbles.type().
        def({
            ctor: function( punctuation ) {
                message += " world" + punctuation;
            }
        });

    var B = bubbles.type().
        extend( A ).
        def({
            ctor: function() {
                message += "hello";
                this._super( "!" );
            }
        });

    var message = "";
    var b = new B();
    equal( message, "hello world!" );
});

test( "grandparent parameterless constructor gets called before parent constructor", function()
{
    var A = bubbles.type().
        def({
            ctor: function() {
                message += " world";
            }
        });

    var B = bubbles.type().
        extend( A ).
        def({
            ctor: function( punctuation ) {
                message += punctuation;
            }
        });

    var C = bubbles.type().
        extend( B ).
        def({
            ctor: function() {
                message += "hello";
                this._super( "!" );
            }
        });

    var message = "";
    var c = new C();
    equal( message, "hello world!" );
});

test( "private methods can be called cross-instance through scope._new", function()
{
    var A = bubbles.type().
        def({
            foo: function() {
                return this.bar();
            },

            _bar: function() {
                return this._new().baz();
            },

            _baz: function( first ) {
                return 2;
            }
        });

    var a = new A();
    equal( a.foo(), 2 );
});

test( "cannot extend type after members have been defined", function()
{
    var A = bubbles.type();
    var B = bubbles.type().def({ foo: function() {} });
    throws( function()
    {
        B.extend( A );
    });
});

test( "type can be instantiated without using the 'new' operator", function()
{
    var A = bubbles.type().
        def({
            ctor: function( a, b, c )
            {
                result = a + b + c;
            }
        })

    var result = 0;
    var a = A( 1, 3, 5 );
    equal( result, 9 );
});

test( "instanceof operator works on public interface", function()
{
    var A = bubbles.type();
    var B = bubbles.type().extend( A );
    var C = bubbles.type().extend( B );

    var a = new A();
    equal( a instanceof A, true );

    var b = new B();
    equal( b instanceof A, true );

    var c = new C();
    equal( c instanceof A, true );
});

test( "instanceof operator works on private scope", function()
{
    var A = bubbles.type().
            def({
                ctor: function() {
                    equal( this instanceof A, true );
                }
            });

    var B = bubbles.type().
            extend( A ).
            def({
                ctor: function() {
                    equal( this instanceof A, true );
                }
            });

    var C = bubbles.type().
            extend( B ).
            def({
                ctor: function() {
                    equal( this instanceof A, true );
                }
            });

    var a = new A();
    var b = new B();
    var c = new C();
});

test( "private methods can be accessed cross-instance through scope._pry", function()
{
    var A = bubbles.type().
            def({
                bar: function( a ) {
                    return this._pry( a ).foo();
                },
                _foo: function() {
                    return "hello";
                }
            });

    var a1 = new A();
    var a2 = new A();
    equal( a2.bar( a1 ), "hello" );
});

test( "scope._pry fails on instances of other types", function()
{
    var A = bubbles.type().
            def({
                _foo: function() { }
            });
    var B = bubbles.type().
            def({
                bar: function( a ) {
                    this._pry( a );
                }
            });

    var a = new A();
    var b = new B();

    throws( function()
    {
        b.bar();
    });
});

test( "scope methods are not accessible on the public interface", function()
{
    var A = bubbles.type();
    var a = new A();
    equal( a._new, undefined );
    equal( a._pry, undefined );
});

test( "$scope returns undefined unless called from scope._pry", function()
{
    var A = bubbles.type();
    var a = new A();
    equal( a.$scope(), undefined );
});
