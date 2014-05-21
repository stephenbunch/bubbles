describe( "Constructor", function()
{
    it( "should call the parent constructor if it is parameterless", function()
    {
        var A = type.Class({
            ctor: function() {
                out += "hello";
            }
        });
        var B = A.extend({
            ctor: function() {
                out += " world";
            }
        });

        var out = "";
        var b = new B();
        expect( out ).to.equal( "hello world" );

        out = "";
        var C = type.Class({
            ctor: function() {
                out = "foo";
            }
        });
        var D = C.extend();
        var d = new D();
        expect( out ).to.equal( "foo" );
    });

    it( "should not call the parent constructor if it contains parameters", function()
    {
        var A = type.Class({
            ctor: function( punctuation ) {
                message += " world" + punctuation;
            }
        });
        var B = A.extend({
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
        var A = type.Class({
            ctor: function() {
                message += " world";
            }
        });
        var B = A.extend({
            ctor: function( punctuation ) {
                message += punctuation;
            }
        });
        var C = B.extend({
            ctor: function() {
                message += "hello";
                this._super( "!" );
            }
        });

        var message = "";
        var c = new C();
        expect( message ).to.equal( "hello world!" );
    });

    it( "should not show up on the private scope or the public interface", function()
    {
        var out = "";
        var A = type.Class({
            ctor: function() {
                out += "ctor";
                expect( this.ctor ).to.equal( undefined );
            },
            foo: function() {
                out += "foo";
                expect( this.ctor ).to.equal( undefined );
            }
        });
        var a = new A();
        a.foo();
        expect( out ).to.equal( "ctorfoo" );
        expect( a.ctor ).to.equal( undefined );
    });
});
