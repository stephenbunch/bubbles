describe( "Kernel", function()
{
    it( "should treat namespaces as path segments", function( done )
    {
        var kernel = type.Kernel();
        kernel.pathPrefix = "test/stubs";
        kernel.get( "ns1.ns2.amd" ).then( function( amd )
        {
            expect( amd.foo() ).to.equal( 2 );
            done();
        });
    });
});
