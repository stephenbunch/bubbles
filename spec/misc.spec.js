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
