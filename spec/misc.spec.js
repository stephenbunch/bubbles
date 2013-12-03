var type = require( "../src/type" );
var expect = require( "chai" ).expect;

describe( "type instantiation", function()
{
    it( "should throw an error if the parent constructor contains parameters and the child constructor does not explicitly call it", function()
    {
        var A = type().def({
            ctor: function( arg ) { }
        });
        var B = type().extend( A );
        expect( function()
        {
            var b = new B();
        }).to.throw( type.InitializationError );
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
        expect( result ).to.equal( 9 );
    });

    it( "should throw an error if not all mixins are initialized", function()
    {
        var A = type();
        var B = type().def({
            ctor: function( a ) {}
        });
        var C = type().include([ A, B ]);
        expect( function()
        {
            var c = new C();
        }).to.throw( type.InitializationError );
    });
});

describe( "instanceof operator", function()
{
    it( "should work on the public interface (except in IE8)", function()
    {
        var A = type();
        var B = type().extend( A );
        var C = type().extend( B );

        var a = new A();
        expect( a ).to.be.instanceof( A );

        var b = new B();
        expect( b ).to.be.instanceof( A );

        var c = new C();
        expect( c ).to.be.instanceof( A );
    });

    it( "should work on the private scope (except in IE8)", function()
    {
        var out = "";
        var A = type().
                def({
                    ctor: function() {
                        out += "a";
                        expect( this ).to.be.instanceof( A );
                    }
                });
        var B = type().
                extend( A ).
                def({
                    ctor: function() {
                        out += "b";
                        expect( this ).to.be.instanceof( A );
                    }
                });
        var C = type().
                extend( B ).
                def({
                    ctor: function() {
                        out += "c";
                        expect( this ).to.be.instanceof( A );
                    }
                });

        var a = new A();
        var b = new B();
        var c = new C();

        expect( out ).to.equal( "aababc" );
    });
});
