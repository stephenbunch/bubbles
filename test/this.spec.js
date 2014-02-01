describe( "this", function()
{
    describe( "._pry()", function()
    {
        it( "should return the private scope of the given instance", function()
        {
            var A = type.define({
                bar: function( a ) {
                    return this._pry( a ).foo();
                },
                __foo: function() {
                    return "hello";
                }
            });
            var a1 = new A();
            var a2 = new A();
            expect( a2.bar( a1 ) ).to.equal( "hello" );
        });

        it( "should not be accessible on the public interface", function()
        {
            var A = type.define();
            var a = new A();
            expect( a._pry ).to.be.undefined;
        });

        it( "should return input if failed", function()
        {
            var out = 0;
            var A = type.define({
                foo: function( test ) {
                    out = this._pry( test );
                }
            });
            var a = new A();
            a.foo( null );
            expect( out ).to.equal( null );

            a.foo( "hello" );
            expect( out ).to.equal( "hello" );
        });
    });

    describe( "._pub", function()
    {
        it( "should return the public interface", function()
        {
            var A = type.define({
                bar: function() {
                    return this._pub;
                }
            });
            var a = new A();
            expect( a.bar() ).to.equal( a );
        });

        it( "should return the public interface of the child", function()
        {
            var A = type.define({
                bar: function() {
                    return this._pub;
                }
            });
            var B = type.define({ extend: A }, {});
            var b = new B();
            expect( b.bar() ).to.equal( b );
        });
    });

    describe( "._super()", function()
    {
        it( "should call the parent method", function()
        {
            var A = type.define({
                $foo: function( message ) {
                    return message + " world";
                }
            });
            var B = type.define({ extend: A }, {
                $foo: function( message ) {
                    return this._super( message ) + "!";
                }
            });
            var b = new B();
            expect( b.foo( "hello" ) ).to.equal( "hello world!" );
        });
    });

    describe( "._init()", function()
    {
        it( "should call the mixin constructor", function()
        {
            var out = null;
            var A = type.define({
                ctor: function( x ) {
                    out = x;
                }
            });
            var B = type.define({ include: [ A ] }, {
                ctor: function() {
                    this._init( A, "foo" );
                }
            });
            var b = new B();
            expect( out ).to.equal( "foo" );
        });

        it( "should not be available if no mixins are defined", function()
        {
            var out = false;
            var A = type.define({
                ctor: function() {
                    out = this._init === undefined;
                }
            });
            var a = new A();
            expect( out ).to.be.true;
        });
    });

    describe( ".children", function()
    {
        it( "[get] and [set] should work in IE8", function()
        {
            var A = type.define(
            {
                get: function() {
                    return this.children;
                },
                set: function( value ) {
                    this.children = value;
                }
            });
            var a = new A();
            expect( a.get() ).to.be.undefined;
            a.set( 2 );
            expect( a.get() ).to.equal( 2 );
        });
    });

    describe( "._value()", function()
    {
        it( "[set] should return the new value", function()
        {
            var out = null;
            var A = type.define({
                foo: {
                    get: null,
                    set: function( value ) {
                        out = this._value( value );
                    }
                }
            });
            var a = new A();
            a.foo = 2;
            expect( out ).to.equal( 2 );
        });
    });
});
