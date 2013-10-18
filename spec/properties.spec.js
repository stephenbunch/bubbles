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
                get: function() {
                    return this._value;
                },
                set: function( value ) {
                    this._value = value;
                    out = this.foo;
                }
            }
        });
        var a = new A();
        a.foo = "hello";
        expect( out ).toBe( "hello" );
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
});
