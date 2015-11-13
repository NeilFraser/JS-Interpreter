declare class Interpreter
{
	constructor(codeText : string, initFunc : Function);

	public step() : void;
	public createPrimitive(data : any) : Object;
	public createNativeFunction(func : any) : Object;
	public createObject(parent : Object) : Object;
	public setProperty( obj : Object, name : any, value : any, opt_fixed? : boolean, opt_nonenum? : boolean) : void;
}
