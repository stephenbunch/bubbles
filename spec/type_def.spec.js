describe( "type.def", function()
{
    it( "should throw an error when overriding a method that is not virtual", function()
    {
        var A = type().def({
            bar: function() {}
        });
        expect( function()
        {
            A.def({
                bar: function() {}
            });
        }).toThrow();
    });

    it( "should support the array syntax for specifing constructor dependencies", function()
    {
        var A = type().def({
            ctor: [ "bar", function( foo )
            {
                this.foo = foo;
            }],
            value: function()
            {
                return this.foo;
            }
        });
        var injector = type.injector().register( "bar", function() { return 2; } );
        var a = injector.resolve( A );
        expect( a.value() ).toBe( 2 );
    });

    it( "should throw an error if the constructor is a defined and no method is provided", function()
    {
        expect( function()
        {
            type().def({ ctor: null });
        }).toThrow();
        expect( function()
        {
            type().def({ ctor: [ "foo", "bar" ] });
        }).toThrow();
    });

    it( "should throw an error if a property's get accessor is not a method or null", function()
    {
        expect( function()
        {
            type().def({
                foo: {
                    get: "bar",
                    set: function() {}
                }
            });
        }).toThrow();
    });

    it( "should throw an error if a property's set accessor is not a method or null", function()
    {
        expect( function()
        {
            type().def({
                foo: {
                    get: function() {},
                    set: "bar"
                }
            });
        }).toThrow();
    });

    it( "should throw an error if a property's read/write capabilities are redefined", function()
    {
        var A = type().def({
            $foo: {
                get: function() {}
            }
        });
        var B = type().extend( A );
        expect( function()
        {
            B.def({
                foo: {
                    set: function() {}
                }
            });
        }).toThrow();
    });

    it( "should throw an error if access modifers are specified for both property accessors", function()
    {
        expect( function()
        {
            var A = type().def({
                foo: {
                    __get: null,
                    __set: null
                }
            });
        }).toThrow();
    });
});
