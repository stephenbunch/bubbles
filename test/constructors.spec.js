describe( "constructors", function()
{
    it( "should call the parent constructor if it is parameterless", function()
    {
        var A = type.define({
            ctor: function() {
                out += "hello";
            }
        });
        var B = type.define({ extend: A }, {
            ctor: function() {
                out += " world";
            }
        });

        var out = "";
        var b = new B();
        expect( out ).to.equal( "hello world" );

        out = "";
        var C = type.define({
            ctor: function() {
                out = "foo";
            }
        });
        var D = type.define({ extend: C }, {} );
        var d = new D();
        expect( out ).to.equal( "foo" );
    });

    it( "should not call the parent constructor if it contains parameters", function()
    {
        var A = type.define({
            ctor: function( punctuation ) {
                message += " world" + punctuation;
            }
        });
        var B = type.define({ extend: A }, {
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
        var A = type.define({
            ctor: function() {
                message += " world";
            }
        });
        var B = type.define({ extend: A }, {
            ctor: function( punctuation ) {
                message += punctuation;
            }
        });
        var C = type.define({ extend: B }, {
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
        type.define( function()
        {
            var scope = this;
            scope.members({ ctor: function() {} });
            expect( function()
            {
                scope.members({ ctor: function() {} });
            }).to.throw( type.Error( "DefinitionError" ) );
        });
    });

    it( "should not show up on the private scope or the public interface", function()
    {
        var out = "";
        var A = type.define({
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
