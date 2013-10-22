describe( "constructors", function()
{
    it( "should call the parent constructor if it is parameterless", function()
    {
        var A = type().
                def({
                    ctor: function() {
                        out += "hello";
                    }
                });
        var B = type().
                extend( A ).
                def({
                    ctor: function() {
                        out += " world";
                    }
                });

        var out = "";
        var b = new B();
        expect( out ).toBe( "hello world" );
    });

    it( "should not call the parent constructor if it contains parameters", function()
    {
        var A = type().
                def({
                    ctor: function( punctuation ) {
                        message += " world" + punctuation;
                    }
                });
        var B = type().
                extend( A ).
                def({
                    ctor: function() {
                        message += "hello";
                        this._super( "!" );
                    }
                });

        var message = "";
        var b = new B();
        expect( message ).toBe( "hello world!" );
    });

    it( "should call the grandparent constructor when the parent constructor is called if it is parameterless", function()
    {
        var A = type().
                def({
                    ctor: function() {
                        message += " world";
                    }
                });
        var B = type().
                extend( A ).
                def({
                    ctor: function( punctuation ) {
                        message += punctuation;
                    }
                });
        var C = type().
                extend( B ).
                def({
                    ctor: function() {
                        message += "hello";
                        this._super( "!" );
                    }
                });

        var message = "";
        var c = new C();
        expect( message ).toBe( "hello world!" );
    });

    it( "cannot be defined twice", function()
    {
        var A = type().
                def({
                    ctor: function() { }
                });
        expect( function()
        {
            A.def({
                ctor: function() { }
            });
        }).toThrow();
    });

    it( "should not show up on the private scope or the public interface", function()
    {
        var out = "";
        var A = type().
                def({
                    ctor: function() {
                        out += "ctor";
                        expect( this.ctor ).toBe( undefined );
                    },
                    foo: function() {
                        out += "foo";
                        expect( this.ctor ).toBe( undefined );
                    }
                });
        var a = new A();
        a.foo();
        expect( out ).toBe( "ctorfoo" );
        expect( a.ctor ).toBe( undefined );
    });
});
