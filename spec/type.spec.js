describe( "type instantiation", function()
{
    it( "should throw an error if the parent constructor contains parameters and child constructor does not explicitly call it", function()
    {
        var A = type().def({
            ctor: function( arg ) { }
        });
        var B = type().extend( A ).def({
            ctor: function() { }
        });
        expect( function()
        {
            var b = new B();
        }).toThrow();
    });

    it( "should work without the 'new' operator", function()
    {
        var A = type().def({
            ctor: function( a, b, c )
            {
                result = a + b + c;
            }
        });
        var result = 0;
        var a = A( 1, 3, 5 );
        expect( result ).toBe( 9 );
    });
});

describe( "type.extend", function()
{
    it( "should throw an error if members have already been defined", function()
    {
        var A = type();
        var B = type().def({ foo: function() {} });
        expect( function()
        {
            B.extend( A );
        }).toThrow();
    });

    it( "should accept strings", function()
    {
        type( "A" ).def({ foo: 2 });
        type( "B" ).extend( "A" );
        var b = type( "B" )();
        expect( b.foo ).toBe( 2 );
        type.destroy( "A" );
        type.destroy( "B" );
    });

    it( "can extend native javascript types", function()
    {
        var A = function() {};
        A.prototype.foo = function() {
            return 2;
        };
        var B = type().extend( A );
        var b = new B();
        expect( b.foo() ).toBe( 2 );
    });

    it( "should throw an error if a circular reference is created", function()
    {
        var A = type();
        expect( function()
        {
            A.extend( A );
        }).toThrow();

        var B = type().extend( A );
        expect( function()
        {
            A.extend( B );
        }).toThrow();

        var C = type().extend( B );
        expect( function()
        {
            A.extend( C );
        }).toThrow();
    });
});

describe( "instanceof operator", function()
{
    it( "should work on the public interface", function()
    {
        var A = type();
        var B = type().extend( A );
        var C = type().extend( B );

        var a = new A();
        expect( a instanceof A ).toBe( true );

        var b = new B();
        expect( b instanceof A ).toBe( true );

        var c = new C();
        expect( c instanceof A ).toBe( true );
    });

    it( "should work on the private scope", function()
    {
        var out = "";
        var A = type().
                def({
                    ctor: function() {
                        out += "a";
                        expect( this instanceof A ).toBe( true );
                    }
                });
        var B = type().
                extend( A ).
                def({
                    ctor: function() {
                        out += "b";
                        expect( this instanceof A ).toBe( true );
                    }
                });
        var C = type().
                extend( B ).
                def({
                    ctor: function() {
                        out += "c";
                        expect( this instanceof A ).toBe( true );
                    }
                });

        var a = new A();
        var b = new B();
        var c = new C();

        expect( out ).toBe( "aababc" );
    });
});

describe( "parent method", function()
{
    it( "should be accessible from the child", function()
    {
        var A = type().
                def({
                    foo: function() {
                        return "hello";
                    }
                });
        var B = type().
                extend( A ).
                def({
                    bar: function() {
                        return " world!";
                    }
                });

        var b = new B();
        expect( b.foo() + b.bar() ).toBe( "hello world!" );
    });
});

describe( "type.include", function()
{
    it( "should add a mixin", function()
    {
        var A = type().def({
            ctor: function() {
                this.message = "hello";
            },
            foo: function() {
                return this.message;
            }
        });
        var B = type().include([ A ]).def({
            ctor: function() {
                this.message = " world";
            },
            bar: function() {
                return this.foo() + this.message;
            }
        });
        var b = new B();
        expect( b.bar() ).toBe( "hello world" );
    });

    it( "should throw an error if a circular reference is created", function()
    {
        var A = type();
        expect( function()
        {
            A.include([ A ]);
        }).toThrow();

        var B = type().include([ A ]);
        expect( function()
        {
            A.include([ B ]);
        }).toThrow();

        var C = type().include([ B ]);
        expect( function()
        {
            A.include([ C ]);
        }).toThrow();
    });

    it( "should throw an error if a mixin has dependencies", function()
    {
        var A = type().def({
            ctor: function( x ) { }
        });
        var B = type();
        expect( function()
        {
            B.include([ A ]);
        }).toThrow();
    });

    it( "should throw an error if mixin is not a type", function()
    {
        var A = type();
        expect( function()
        {
            A.include([ function() {} ]);
        }).toThrow();
    });
});
