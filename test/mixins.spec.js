describe( "mixins", function()
{
    it( "should mix protected members", function()
    {
        var A = type.define({
            _foo: function() {
                return "hello";
            }
        });
        var B = type.define({ include: [ A ] }, {
            bar: function() {
                return this.foo() + " world";
            }
        });
        var b = new B();
        expect( b.bar() ).to.equal( "hello world" );
        expect( b.foo ).to.be.undefined;
    });

    it( "should not mix private members", function()
    {
        var out = null;
        var A = type.define({
            __foo: function() {
                return "hello";
            }
        });
        var B = type.define({ include: [ A ] }, {
            bar: function() {
                out = this.foo;
            }
        });
        var b = new B();
        b.bar();
        expect( out ).to.be.undefined;
    });

    it( "should overwrite each other in the order specified", function()
    {
        var A = type.define({
            foo: function() {
                return 1;
            }
        });
        var B = type.define({
            foo: function() {
                return 2;
            }
        });
        var C = type.define({ include: [ A, B ] }, {});
        var c = new C();
        expect( c.foo() ).to.equal( 2 );
    });

    it( "should not overwrite original or base type members", function()
    {
        var A = type.define({
            foo: function() {
                return 2;
            }
        });
        var C = type.define({
            foo: function() {
                return 1;
            },
            bar: function() {
                return 1;
            }
        });
        var B = type.define({
            extend: A,
            include: [ C ]
        }, {
            bar: function() {
                return 2;
            }
        });
        var b = new B();
        expect( b.foo() ).to.equal( 2 );
        expect( b.bar() ).to.equal( 2 );
    });
});
