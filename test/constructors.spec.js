describe( "constructors", function()
{
    it( "should call the parent constructor if it is parameterless", function()
    {
        var A = type.def({
            ctor: function() {
                out += "hello";
            }
        });
        var B = type.def({ extend: A }, {
            ctor: function() {
                out += " world";
            }
        });

        var out = "";
        var b = new B();
        expect( out ).to.equal( "hello world" );

        out = "";
        var C = type.def({
            ctor: function() {
                out = "foo";
            }
        });
        var D = type.def({ extend: C }, {} );
        var d = new D();
        expect( out ).to.equal( "foo" );
    });

    it( "should not call the parent constructor if it contains parameters", function()
    {
        var A = type.def({
            ctor: function( punctuation ) {
                message += " world" + punctuation;
            }
        });
        var B = type.def({ extend: A }, {
            ctor: function() {
                message += "hello";
                this._super( "!" );
            }
        });

        var message = "";
        var b = new B();
        expect( message ).to.equal( "hello world!" );
    });

    it( "should call the grandparent constructor when the parent constructor is called if it is parameterless", function()
    {
        var A = type.def({
            ctor: function() {
                message += " world";
            }
        });
        var B = type.def({ extend: A }, {
            ctor: function( punctuation ) {
                message += punctuation;
            }
        });
        var C = type.def({ extend: B }, {
            ctor: function() {
                message += "hello";
                this._super( "!" );
            }
        });

        var message = "";
        var c = new C();
        expect( message ).to.equal( "hello world!" );
    });

    it( "cannot be defined twice", function()
    {
        type.def( function()
        {
            var scope = this;
            scope.members({ ctor: function() {} });
            expect( function()
            {
                scope.members({ ctor: function() {} });
            }).to.throw( type.error( "DefinitionError" ) );
        });
    });

    it( "should not show up on the private scope or the public interface", function()
    {
        var out = "";
        var A = type.def({
            ctor: function() {
                out += "ctor";
                expect( this.ctor ).to.be.undefined;
            },
            foo: function() {
                out += "foo";
                expect( this.ctor ).to.be.undefined;
            }
        });
        var a = new A();
        a.foo();
        expect( out ).to.equal( "ctorfoo" );
        expect( a.ctor ).to.be.undefined;
    });
});
