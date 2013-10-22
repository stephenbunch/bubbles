describe( "mixins", function()
{
    it( "should mix protected members", function()
    {
        var A = type().def({
            _foo: function() {
                return "hello";
            }
        });
        var B = type().include([ A ]).def({
            bar: function() {
                return this.foo() + " world";
            }
        });
        var b = new B();
        expect( b.bar() ).toBe( "hello world" );
        expect( b.foo ).not.toBeDefined();
    });

    it( "should not mix private members", function()
    {
        var out = null;
        var A = type().def({
            __foo: function() {
                return "hello";
            }
        });
        var B = type().include([ A ]).def({
            bar: function() {
                out = this.foo;
            }
        });
        var b = new B();
        b.bar();
        expect( out ).not.toBeDefined();
    });

    it( "should overwrite each other in the order specified", function()
    {
        var A = type().def({
            foo: function() {
                return 1;
            }
        });
        var B = type().def({
            foo: function() {
                return 2;
            }
        });
        var C = type().include([ A, B ]);
        var c = new C();
        expect( c.foo() ).toBe( 2 );
    });

    it( "should not overwrite original or base type members", function()
    {
        var A = type().def({
            foo: function() {
                return 2;
            }
        });
        var C = type().def({
            foo: function() {
                return 1;
            },
            bar: function() {
                return 1;
            }
        });
        var B = type().extend( A ).include([ C ]).def({
            bar: function() {
                return 2;
            }
        });
        var b = new B();
        expect( b.foo() ).toBe( 2 );
        expect( b.bar() ).toBe( 2 );
    });
});
