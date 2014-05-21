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

    it( "can transclude members from other objects", function()
    {
        var A = function() {
            this._foo = 2;
        };
        A.prototype.foo = function() {
            return this._foo;
        };

        var B = type.Class({
            ctor: function( a ) {
                this._include( a );
            }
        });
        var b = new B( new A() );
        expect( b.foo() ).to.equal( 2 );
    });

    it( "should not transclude members that are already defined by the type", function()
    {
        var A = type.Class({
            foo: function() {
                return 2;
            },
            bar: function() {
                return 4;
            }
        });
        var B = type.Class({
            ctor: function( a ) {
                this._include( a );
            },
            bar: function() {
                return 8;
            }
        });
        var b = new B( new A() );
        expect( b.foo() ).to.equal( 2 );
        expect( b.bar() ).to.equal( 8 );
    });

    it( "can transclude a member from another object with a custom name", function()
    {
        var A = type.Class({
            ctor: function() {
                this.foo = 2;
            },
            foo: null
        });
        var B = type.Class({
            ctor: function( a ) {
                this._include( a, "foo", "bar" );
            }
        });
        var b = new B( new A() );
        expect( b.foo ).to.equal( undefined );
        expect( b.bar ).to.equal( 2 );
    });

    it( "can transclude events", function()
    {
        var A = type.Class({
            click: type.Event,
            test: function() {
                this.click( "hello" );
            }
        });
        var B = type.Class({
            ctor: function( a ) {
                this._include( a, "click" );
            },
            test: function() {
                this.click( "hello" );
            }
        });
        var a = new A();
        var b = new B( a );
        var out;
        b.click += function( message ) {
            out = message;
        };
        a.test();
        expect( out ).to.equal( "hello" );
        expect( function() {
            b.test();
        }).to.throwException( function( e ) {
            expect( e ).to.be.a( type.error( "InvalidOperationError" ) );
        });
    });
});
