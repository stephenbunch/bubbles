function Lazy( service )
{
    if ( !( this instanceof Lazy ) )
        return new Lazy( service );
    this.value = service;
}
