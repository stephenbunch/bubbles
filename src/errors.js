var TypeDefinitionError = function( message ) {
    this.message = message;
};
TypeDefinitionError.prototype = new Error();
TypeDefinitionError.prototype.name = "TypeDefinitionError";

var TypeInitializationError = function( message ) {
    this.message = message;
};
TypeInitializationError.prototype = new Error();
TypeInitializationError.prototype.name = "TypeInitializationError";

var AccessViolationError = function( message ) {
    this.message = message;
};
AccessViolationError.prototype = new Error();
AccessViolationError.prototype.name = "AccessViolationError";
