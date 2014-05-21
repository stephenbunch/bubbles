describe( "Property", function()
{
    it( "can read and write values", function() {
        var A = type.Class({
            foo: null
        });
        var a = new A();
        a.foo = "hello";
        expect( a.foo ).to.equal( "hello" );
        a.dispose();
    });

    it( "should support custom get and set accessors", function()
    {
        var A = type.Class({
            foo: {
                get: function() {
                    return this._value() * 2;
                },
                set: function( value ) {
                    this._value( value * 2 );
                }
            }
        });
        var a = new A();
        a.foo = 2;
        expect( a.foo ).to.equal( 8 );
        a.dispose();
    });

    it( "can be extended", function()
    {
        var A = type.Class({
            $foo: {
                get: function() {
                    return "hello " + this._value();
                },
                set: function( value ) {
                    this._value( value );
                }
            }
        });
        var B = A.extend({
            foo: {
                get: function() {
                    return this._super();
                },
                set: function( value ) {
                    this._super( value + "!" );
                }
            }
        });
        var b = new B();
        b.foo = "world";
        expect( b.foo ).to.equal( "hello world!" );
        b.dispose();
    });

    it( "can specify a default value", function()
    {
        var A = type.Class({
            foo: 2
        });
        var B = type.Class({
            foo: {
                value: 3,
                get: function() {
                    return this._value();
                }
            }
        });
        var a = new A();
        var b = new B();
        expect( a.foo ).to.equal( 2 );
        expect( b.foo ).to.equal( 3 );
        a.dispose();
        b.dispose();
    });

    it( "can be read immediately after being set without leaving the execution context of the set accessor", function()
    {
        var out = null;
        var A = type.Class({
            foo: {
                get: null,
                set: function( value )
                {
                    this._value( value );
                    out = this.foo;
                }
            }
        });
        var a = new A();
        a.foo = "hello";
        expect( out ).to.equal( "hello" );
        a.dispose();
    });

    it( "can be read within a setter", function()
    {
        var out1 = null;
        var out2 = null;
        var A = type.Class({
            foo: {
                value: "hello",
                get: null,
                set: function( value )
                {
                    out1 = this.foo;
                    this._value( value );
                    out2 = this.foo;
                }
            }
        });
        var a = new A();
        a.foo = "world";
        expect( out1 ).to.equal( "hello" );
        expect( out2 ).to.equal( "world" );
        a.dispose();
    });

    it( "should use default accessor implementation when null is given instead of a function", function()
    {
        var A = type.Class({
            foo: {
                value: 1,
                get: null
            }
        });
        var a = new A();
        expect( a.foo ).to.equal( 1 );
        a.dispose();
    });

    it( "can specify separate access modifers for 'get' and 'set'", function()
    {
        var A = type.Class({
            ctor: function() {
                this.foo = 1;
            },
            foo: { get: null, __set: null }
        });
        var a = new A();
        expect( a.foo ).to.equal( 1 );
        a.foo = 2;
        expect( a.foo ).to.equal( 1 );
        a.dispose();
    });

    it( "should throw an error if writing to a read-only property or reading from a write-only property", function()
    {
        var A = type.Class({ foo: { get: null } });
        var a = new A();
        a.foo = 2;
        expect( a.foo ).to.equal( null );
        a.dispose();
    });

    it( "can be protected with a private setter", function()
    {
        var A = type.Class({ _foo: { get: null, __set: null, value: "hello" } });
        var B = A.extend({
            read: function() {
                return this.foo;
            },
            write: function( value ) {
                this.foo = value;
            }
        });
        var b = new B();
        expect( b.foo ).to.be.undefined;
        expect( b.read() ).to.equal( "hello" );
        b.write( "test" );
        expect( b.read() ).to.equal( "hello" );
        b.dispose();
    });

    it( "should be enumerable (except in IE8)", function()
    {
        var A = type.Class({ foo: 2 });
        var a = new A();
        var found = false;
        for ( var p in a )
        {
            if ( p === "foo" )
            {
                found = true;
                break;
            }
        }
        expect( found ).to.equal( true );
        a.dispose();
    });
});
