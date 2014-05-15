function Factory( service )
{
    if ( !( this instanceof Factory ) )
        return new Factory( service );
    this.value = service;
}
