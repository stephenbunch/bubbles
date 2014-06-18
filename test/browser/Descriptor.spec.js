describe( "Descriptor", function()
{
    it( "should throw an error when overriding a method that is not virtual", function()
    {
        var A = type.Class({
            bar: function() {}
        });
        expect( function()
        {
            A.extend({
                bar: function() {}
            });
        }).to.throwException( function( e ) {
            expect( e ).to.be.a( type.error( "DefinitionError" ) );
        });
    });

    it( "should support the array syntax for specifing constructor dependencies", function( done )
    {
        var A = type.Class({
            ctor: [ "bar", function( foo ) {
                this.foo = foo;
            }],
            value: function() {
                return this.foo;
            }
        });
        var kernel = type.Kernel();
        kernel.bind( "bar" ).to( function() { return 2; } );
        kernel.get( A ).then( function( a )
        {
            expect( a.value() ).to.equal( 2 );
            done();
        });
    });

    it( "should throw an error if the constructor is defined and no method is provided", function()
    {
        expect( function()
        {
            type.Class({ ctor: null });
        }).to.throwException( function( e ) {
            expect( e ).to.be.a( TypeError );
        });
        expect( function()
        {
            type.Class({ ctor: [ "foo", "bar" ] });
        }).to.throwException( function( e ) {
            expect( e ).to.be.a( TypeError );
        });
    });

    it( "should throw an error if a property's get accessor is not a method or null", function()
    {
        expect( function()
        {
            type.Class({
                foo: {
                    get: "bar",
                    set: function() {}
                }
            });
        }).to.throwException( function( e ) {
            expect( e ).to.be.a( TypeError );
        });
    });

    it( "should throw an error if a property's set accessor is not a method or null", function()
    {
        expect( function()
        {
            type.Class({
                foo: {
                    get: function() {},
                    set: "bar"
                }
            });
        }).to.throwException( function( e ) {
            expect( e ).to.be.a( TypeError );
        });
    });

    it( "should throw an error if a property's read/write capabilities are redefined", function()
    {
        var A = type.Class({
            $foo: {
                get: function() {}
            }
        });
        expect( function()
        {
            A.extend({
                foo: {
                    set: function() {}
                }
            });
        }).to.throwException( function( e ) {
            expect( e ).to.be.a( type.error( "DefinitionError" ) );
        });
    });

    it( "should throw an error if access modifers are specified for both property accessors", function()
    {
        expect( function()
        {
            var A = type.Class({
                foo: {
                    __get: null,
                    __set: null
                }
            });
        }).to.throwException( function( e ) {
            expect( e ).to.be.a( type.error( "DefinitionError" ) );
        });
    });

    it( "should throw an error if the parent constructor contains parameters and is not called from the child constructor", function()
    {
        var A = type.Class({
            ctor: function( a ) {}
        });
        expect( function()
        {
            A.extend();
        }).to.throwException( function( e ) {
            expect( e ).to.be.a( type.error( "DefinitionError" ) );
        });
    });

    it( "can extend native javascript types", function()
    {
        var A = function() {};
        A.prototype.foo = function() {
            return 2;
        };
        var B = type.extend( A );
        var b = new B();
        expect( b.foo() ).to.equal( 2 );
    });

    it( "can define one or more events", function()
    {
        var A = type.Class({ foo: type.Event, bar: type.Event });
        var a = new A();

        expect( function() {
            a.foo();
        }).to.throwException( function( e ) {
            expect( e ).to.be.a( type.error( "InvalidOperationError" ) );
        });

        expect( function() {
            a.bar();
        }).to.throwException( function( e ) {
            expect( e ).to.be.a( type.error( "InvalidOperationError" ) );
        });
    });

    it( "should throw an error if a member is defined twice", function()
    {
        expect( function()
        {
            type.Class({
                __foo: function() {},
                foo: null
            });
        }).to.throwException( function( e ) {
            expect( e ).to.be.a( type.error( "DefinitionError" ) );
        });
    });

    describe( "__<name> (private members)", function()
    {
        it( "should be hidden", function()
        {
            var A = type.Class({
                __bar: function() { }
            });
            var a = new A();
            expect( a.bar ).to.equal( undefined );
        });

        it( "can be accessible from the inside", function()
        {
            var A = type.Class({
                bar: function( message ) {
                    return this.baz( message + " world" );
                },
                __baz: function( message ) {
                    return message + "!";
                }
            });
            var a = new A();
            expect( a.bar( "hello" ) ).to.equal( "hello world!" );
        });

        it( "should not overwrite private parent methods with the same name", function()
        {
            var A = type.Class({
                foo: function() {
                    return this.bar();
                },
                __bar: function() {
                    return "hello";
                }
            });
            var B = A.extend({
                baz: function() {
                    return this.foo() + this.bar();
                },
                __bar: function() {
                    return " world!";
                }
            });
            var b = new B();
            expect( b.baz() ).to.equal( "hello world!" );
        });
    });

    describe( "_<name> (protected members)", function()
    {
        it( "should be accessible from the inside", function()
        {
            var A = type.Class({
                _foo: function() {
                    return "hello";
                }
            });
            var B = A.extend({
                bar: function() {
                    return this.foo();
                }
            });
            var b = new B();
            expect( b.bar() ).to.equal( "hello" );
        });

        it( "should be hidden from the outside", function()
        {
            var A = type.Class({
                _foo: function() { }
            });
            var a = new A();
            expect( a.foo ).to.equal( undefined );
        });

        it( "should not be overridable by default", function()
        {
            var A = type.Class({
                _foo: function() { }
            });
            expect( function()
            {
                A.extend({
                    _foo: function() { }
                });
            }).to.throwException( function( e ) {
                expect( e ).to.be.a( type.error( "DefinitionError" ) );
            });
        });
    });

    describe( "_$<name> (protected virtual members)", function()
    {
        it( "should be overridable", function()
        {
            var A = type.Class({
                _$foo: function() {
                    return "hello";
                },
                bar: function() {
                    return this.foo();
                }
            });
            var B = A.extend({
                _$foo: function() {
                    return this._super() + " world";
                }
            });
            var C = B.extend();
            var c = new C();
            expect( c.bar() ).to.equal( "hello world" );
        });

        it( "can be sealed", function()
        {
            var A = type.Class({
                _$foo: function() { }
            });
            var B = A.extend({
                _foo: function() { }
            });
            expect( function()
            {
                B.extend({
                    _foo: function() { }
                });
            }).to.throwException( function( e ) {
                expect( e ).to.be.a( type.error( "DefinitionError" ) );
            });
        });

        it( "cannot be made public", function()
        {
            var A = type.Class({
                _$foo: function() { }
            });
            expect( function()
            {
                A.extend({
                    $foo: function() { }
                });
            }).to.throwException( function( e ) {
                expect( e ).to.be.a( type.error( "DefinitionError" ) );
            });
        });
    });

    describe( "$<name> (public virtual members)", function()
    {
        it( "cannot be made protected", function()
        {
            var A = type.Class({
                $foo: function() { }
            });
            expect( function()
            {
                A.extend({
                    _$foo: function() { }
                });
            }).to.throwException( function( e ) {
                expect( e ).to.be.a( type.error( "DefinitionError" ) );
            });
        });

        it( "can be sealed", function()
        {
            var A = type.Class({
                $foo: function() { }
            });
            var B = A.extend({
                foo: function () {}
            });
            expect( function()
            {
                B.extend({
                    foo: function() { }
                });
            }).to.throwException( function( e ) {
                expect( e ).to.be.a( type.error( "DefinitionError" ) );
            });
        });
    });

    describe( "base members", function()
    {
        it( "should be accessible from the child", function()
        {
            var A = type.Class({
                foo: function() {
                    return "hello";
                }
            });
            var B = A.extend({
                bar: function() {
                    return " world!";
                }
            });
            var b = new B();
            expect( b.foo() + b.bar() ).to.equal( "hello world!" );
        });
    });
});
