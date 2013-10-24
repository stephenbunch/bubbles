describe( "properties", function()
{
    it( "can read and write values", function() {
        var A = type().
                def({
                    foo: null
                });
        var a = new A();
        a.foo = "hello";
        expect( a.foo ).toBe( "hello" );
    });

    it( "should support custom get and set accessors", function()
    {
        var A = type().
                def({
                    foo: {
                        get: function() {
                            return this._value * 2;
                        },
                        set: function( value ) {
                            this._value = value * 2;
                        }
                    }
                });
        var a = new A();
        a.foo = 2;
        expect( a.foo ).toBe( 8 );
    });

    it( "can be extended", function()
    {
        var A = type().
                def({
                    $foo: {
                        get: function() {
                            return "hello " + this._value;
                        },
                        set: function( value ) {
                            this._value = value;
                        }
                    }
                });
        var B = type().
                extend( A ).
                def({
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
        expect( b.foo ).toBe( "hello world!" );
    });

    it( "can specify a default value", function()
    {
        var A = type().def({
            foo: 2
        });
        var B = type().def({
            foo: {
                value: 3,
                get: function() {
                    return this._value;
                }
            }
        });
        var a = new A();
        var b = new B();
        expect( a.foo ).toBe( 2 );
        expect( b.foo ).toBe( 3 );
    });

    it( "can be read immediately after being set without leaving the execution context of the set accessor", function()
    {
        var out = null;
        var A = type().def({
            foo: {
                get: null,
                set: function( value )
                {
                    this._value = value;
                    out = this.foo;
                }
            }
        });
        var a = new A();
        a.foo = "hello";
        expect( out ).toBe( "hello" );
    });

    it( "can be read within a setter", function()
    {
        var out1 = null;
        var out2 = null;
        var A = type().def({
            foo: {
                value: "hello",
                get: null,
                set: function( value )
                {
                    out1 = this.foo;
                    this._value = value;
                    out2 = this.foo;
                }
            }
        });
        var a = new A();
        a.foo = "world";
        expect( out1 ).toBe( "hello" );
        expect( out2 ).toBe( "world" );
    });

    it( "should use default accessor implementation when null is given instead of a function", function()
    {
        var A = type().def({
            foo: {
                value: 1,
                get: null
            }
        });
        var a = new A();
        expect( a.foo ).toBe( 1 );
    });

    it( "can specify separate access modifers for 'get' and 'set'", function()
    {
        var A = type().def({
            ctor: function() {
                this.foo = 1;
            },
            foo: { get: null, __set: null }
        });
        var a = new A();
        expect( a.foo ).toBe( 1 );
        expect( function()
        {
            a.foo = 2;
        }).toThrow();
    });

    it( "should throw an error if writing to a read-only property or reading from a write-only property", function()
    {
        var A = type().def({ foo: { get: null } });
        var a = new A();
        expect( function()
        {
            a.foo = 2;
        }).toThrow();
    });

    it( "can be protected with a private setter", function()
    {
        var A = type().def({ _foo: { get: null, __set: null, value: "hello" } });
        var B = type().extend( A ).def({
            read: function() {
                return this.foo;
            },
            write: function( value ) {
                this.foo = value;
            }
        });
        var b = new B();
        expect( b.foo ).not.toBeDefined();
        expect( b.read() ).toBe( "hello" );
        expect( function()
        {
            b.write( "test" );
        }).toThrow();
    });

    it( "should be enumerable", function()
    {
        var A = type().def({ foo: 2 });
        var a = new A();
        var out;
        for ( var p in a )
        {
            out = p;
            break;
        }
        expect( out ).toBe( "foo" );
    });
});
