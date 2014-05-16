describe( "type instantiation", function()
{
    it( "should throw an error if the parent constructor contains parameters and the child constructor does not explicitly call it", function()
    {
        var A = type.def({
            ctor: function( arg ) { }
        });
        var B = type.def({ extend: A }, {} );
        expect( function()
        {
            var b = new B();
        }).to.throw( type.error( "InitializationError" ) );
    });

    it( "should work without the 'new' operator", function()
    {
        var A = type.def({
            ctor: function( a, b, c )
            {
                result = a + b + c;
            }
        });
        var result = 0;
        var a = A( 1, 3, 5 );
        expect( result ).to.equal( 9 );
    });
});

describe( "`instanceof` operator", function()
{
    it( "should work on the public interface (except in IE8)", function()
    {
        var A = type.def();
        var B = type.def({ extend: A }, {} );
        var C = type.def({ extend: B }, {} );

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
        var A = type.def({
            ctor: function() {
                out += "a";
                expect( this ).to.be.instanceof( A );
            }
        });
        var B = type.def({ extend: A }, {
            ctor: function() {
                out += "b";
                expect( this ).to.be.instanceof( A );
            }
        });
        var C = type.def({ extend: B }, {
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

describe( ".__scope__", function()
{
    it( "should return undefined", function()
    {
        var A = type.def();
        var a = new A();
        expect( a.__scope__ ).to.be.undefined;
    });
});

describe( "<type>.extend()", function()
{
    it( "should behave the same as .def({ extend: <type> })", function()
    {
        var Car = type.def({
            $drive: function() {
                return "vroom!";
            }
        });

        var AutopiaCar = Car.extend({
            $drive: function() {
                return "I like to go " + this._super();
            }
        });

        var car = new AutopiaCar();
        expect( car.drive() ).to.equal( "I like to go vroom!" );
    });
});
