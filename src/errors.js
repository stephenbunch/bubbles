var DefinitionError = function( message ) {
    this.message = message;
};
DefinitionError.prototype = new Error();
DefinitionError.prototype.name = "type.DefinitionError";

var InitializationError = function( message ) {
    this.message = message;
};
InitializationError.prototype = new Error();
InitializationError.prototype.name = "type.InitializationError";

var AccessViolationError = function( message ) {
    this.message = message;
};
AccessViolationError.prototype = new Error();
AccessViolationError.prototype.name = "type.AccessViolationError";

var InvalidOperationError = function( message ) {
    this.message = message;
};
InvalidOperationError.prototype = new Error();
InvalidOperationError.prototype.name = "type.InvalidOperationError";

var ArgumentError = function( message ) {
    this.message = message;
};
ArgumentError.prototype = new Error();
ArgumentError.prototype.name = "type.ArgumentError";

module.exports =
{
    DefinitionError: DefinitionError,
    InitializationError: InitializationError,
    AccessViolationError: AccessViolationError,
    InvalidOperationError: InvalidOperationError,
    ArgumentError: ArgumentError
};
