(() => {


    let verbosity = 0;

    function log(level, msg1, msg2, msg3, msg4) {
        if (level <= verbosity) {
            console.log(msg1, msg2, msg3, msg4);
        }
    }


    let randstate = 2;

    function debugRandom() {
        //randstate += 811;
        //randstate = randstate % 1091;
        //let rv = (randstate) / 1091;
        //console.log(rv);
        randstate = Math.sin(randstate) * 5000;
        let rv = randstate - Math.floor(randstate);
        //console.log(rv);
        return rv;
    }

    //Math.random = debugRandom;


    let NOVALUE = "NOVAL@#";



    class Type {

    }

    class Primitive extends Type {
        constructor(name) {
            super();
            this.name = name;
        }
        toString() {
            return this.name;
        }
        addId() {
            return this;
        }
        replaceVar(f) {
            return this;
        }
        compatible(t) {
            if(t instanceof Primitive) {
                return this.name == t.name;
            }
            if (t instanceof TypeVar) {
                return true;
            }
            return false;
        }
        contains() {
            return false;
        }
    }

    let greeks = {
        "\\alpha": "α",
        "\\beta": "β",
        "\\gamma": "γ",
        "\\delta": "δ",
        "\\epsilon": "ε",
    }

    class TypeVar extends Type {
        constructor(name, id) {
            super();
            this.name = name;
            if (id != undefined) {
                this.id = id;
            }
        }
        toString() {
            let rv;
            if (this.name in greeks) {
                rv= greeks[this.name];
            } else {
                rv= this.name;
            }
            if ('id' in this) {
                rv += "."+ this.id;
            }
            return rv;
        }
        addId(id) {
            if ('id' in this) {
                return this;
            } else {
                return new TypeVar(this.name, id);
            }            
        }
        replaceVar(f) {
            return f(this);
        }
        compatible(t) {
            return true;
        }
        contains(alt) {
            if (alt instanceof TypeVar) {
                if ('id' in this) {
                    return alt.name == this.name && alt.id === this.id;
                } else {
                    return alt.name == this.name;
                }                
            } else {
                //alt must be a string;               
                return alt == this.toString();
            }
            
        }

    }

    class Parametric extends Type {
        constructor(name, params) {
            super();
            this.name = name;
            this.params = params;
        }
        toString() {
            let rv = this.name;
            rv += "[";
            for (let i = 0; i < this.params.length; ++i) {
                rv += this.params[i].toString();
                if (i < this.params.length - 1) {
                    rv += ", ";
                }
            }
            rv += "]";
            return rv;
        }
        addId(id) {
            let np = [];
            let changed = false;
            for (let i = 0; i < this.params.length; ++i) {
                let p = this.params[i].addId(id);
                np.push(p);
                if(p != this.params[i]) {
                    changed = true;
                }
            }
            if (changed) {
                return new Parametric(this.name, np);
            } else {
                return this;
            }
        }
        replaceVar(f) {
            let np = [];
            let changed = false;
            for (let i = 0; i < this.params.length; ++i) {
                let p = this.params[i].replaceVar(f);
                np.push(p);
                if (p != this.params[i]) {
                    changed = true;
                }
            }
            if (changed) {
                return new Parametric(this.name, np);
            } else {
                return this;
            }
        }
        compatible(t) {
            if (t instanceof Primitive) {
                return false;
            }
            if (t instanceof TypeVar) {
                return true;
            }
            if (t instanceof Parametric) {
                if (this.name != t.name) {
                    return false;
                }
                if (this.params.length != t.params.length) {
                    return false;
                }
                for (let i = 0; i < this.params.length; ++i) {
                    if (!this.params[i].compatible(t.params[i])) {
                        return false;
                    }
                }
                return true;
            }
            if (t instanceof FunctionType) {
                return false;
            }
        }
        contains(alt) {
            //assumes alt is a typeVar
            for (let p of this.params) {
                if (p.contains(alt)) {
                    return true;
                }
            }
            return false;
        }
    }
    class FunctionType extends Type {
        constructor(from, to) {
            super();
            this.from = from;
            this.to = to;
        }
        toString() {
            let rv = this.from.toString();
            if (this.from instanceof FunctionType) {
                rv = "(" + rv + ")";
            }
            return rv + " -> " + this.to.toString();
        }
        addId(id) {
            let newfrom = this.from.addId(id);
            let newto = this.to.addId(id);
            if (newfrom != this.from || newto != this.to) {
                return new FunctionType(newfrom, newto);
            } else {
                return this;
            }
        }
        replaceVar(f) {
            let newfrom = this.from.replaceVar(f);
            let newto = this.to.replaceVar(f);
            if (newfrom != this.from || newto != this.to) {
                return new FunctionType(newfrom, newto);
            } else {
                return this;
            }
        }
        compatible(t) {
            if (t instanceof FunctionType) {
                return this.from.compatible(t.from) && this.to.compatible(t.to);
            }
            return t.compatible(this);
        }
        contains(alt) {
            //assumes alt is a typeVar
            return this.from.contains(alt) || this.to.contains(alt);
        }
    }

    //This function parses a string representing a type into an AST of types.
    //Type variables are represented wity Latex greek letters (e.g. \alpha, \beta),
    //primitive types are represented with their name (e.g. int, string),
    //parametric types are represented with a name and its parameters in square brackets (e.g. list[int], set[\alpha])
    //Function types are represented with the -> symbol (e.g. int -> string -> bool)
    function parseType(str) {
        function consume(token, str) {
            let rv = str.match(token);
            if (rv) {
                return str.substring(rv.index + rv[0].length).trim();
            } else {
                throw "Expected " + token + " but got " + str;
            }
        }        
        function parseName(str) {
            //check if it's a primitive or a type var and then return either [Primitive, rest] or [TypeVar, rest]]
            let rv = str.match(/^[a-zA-Z]+/);
            if (rv) {
                return [new Primitive(rv[0]), str.substring(rv[0].length).trim()];
            }
            rv = str.match(/^\\[a-zA-Z]+/);
            if (rv) {
                return [new TypeVar(rv[0]), str.substring(rv[0].length).trim()];
            } else {
                throw "Expected a type name or a type variable but got " + str;
            }            
        }

        str = str.trim();
        let type;
        if (str[0] == "(") {
            let rv = parseType(str.substring(1));
            str = consume("\\)", rv[1]);
            type = rv[0];
        } else {
            let res = parseName(str);
            type = res[0];
            str = res[1];
            if (str[0] == "[") {
                let params = [];
                str = consume("\\[", str);
                while (str[0] != "]") {
                    let res = parseType(str);
                    params.push(res[0]);
                    str = res[1];
                    if (str[0] == ",") {
                        str = consume(",", str);
                    }
                }
                str = consume("\\]", str);
                type = new Parametric(type.name, params);
            }
        }
        if(str[0] == "-") {
            str = consume("->", str);
            let res = parseType(str);
            type = new FunctionType(type, res[0]);
            str = res[1];
        }
        return [type, str];
    }
    function Tp(str) {
        let rv = parseType(str);
        return rv[0];
    }



    class TypeChecker {

        constructor() {
            this.constraints = {};
        }

        reset() {
            this.constraints = {};
        }

        checkpoint() {
            //return a clone of the constraints object
            //return Object.assign({}, this.constraints);
            let rv = {};
            let tc = this.constraints;
            for (let key in tc) {
                rv[key] = tc[key];
            }
            return rv;
        }
        revert(checkpoint) {
            //this.constraints = Object.assign({}, checkpoint);
            let tc = {};
            for (let key in checkpoint) {
                tc[key] = checkpoint[key];
            }
            this.constraints = tc;
        }

        checkStep(node, expectedType) {
            if (!expectedType) { return true; }
            if (node.kind == "lambda") {
                return expectedType instanceof FunctionType;
            }
            if (node.kind == 'fun') {
                return expectedType.compatible(node.returntype);
            }
            if (node.type) {
                return expectedType.compatible(node.type);
            }            
            return true;
        }

        /**
         * This function takes a type and replaces any type variables that have been constrained to a concrete type.        
         * @param {any} type
         * @param {any} id
         * @param {any} limit
         * @returns
         */
        convert(type, id, limit) {
            if (limit == undefined) { limit = 20; }
            if (limit <= 0) {
                throw "Too much";
            }
            return type.replaceVar((t) => {
                t = t.addId(id);
                let ts = t.toString();
                if (ts in this.constraints) {
                    return this.convert(this.constraints[ts], undefined, limit-1);
                } else {
                    return t;
                }
            });            
        }
        /**
         * This function is similar to convert, but it assumes that the type variables aready have their id set. 
         * This is only used internally when generating constraints to avoid converting a type variable to another type variable 
         * when it is possible to convert it all the way to a primitive.
         * @param {any} type
         * @param {any} limit
         * @returns
         */
        localConvert(type, limit) {
            if (type instanceof Primitive) {
                return type;
            }
            if (limit == undefined) { limit = 20; }
            if (limit <= 0) {
                throw "Too much";
            }            
            return type.replaceVar((t) => {               
                let ts = t.toString();
                if (ts in this.constraints) {
                    return this.localConvert(this.constraints[ts], limit - 1);
                } else {
                    return t;
                }
            });  
        }


        constraint(ta, tb) {
            if (ta in this.constraints) {
                let alt = this.localConvert(this.constraints[ta]);                
                if (alt instanceof TypeVar) {                    
                    if (!(tb instanceof TypeVar)) {
                        //We need to check if the parametric doesn't contain alt internally, because then it wouldn't be compatible.
                        if (!(tb.contains(alt))) {
                            this.constraints[ta] = tb;
                            this.constraints[alt.toString()] = tb;
                            return true;
                        } else {
                            //console.log("Trying to unify " + ta + " with " + tb.toString() + " but they are incompatible.");                            
                            return false;
                        }
                    }
                    //console.log("Trying to unify " + ta + " with " + tb.toString() + " but they are incompatible.");
                    throw "NYI";
                    return false;
                } else {
                    let tbs = tb.toString();
                    let alts = alt.toString();
                    if (tbs == alts) {
                        return true;
                    }
                    if (tb instanceof TypeVar) {                        
                        return this.constraint(tbs, alt);                        
                    }
                    //console.log("Trying to unify " + ta + " with " + tb.toString() + " but it's already constrained to " + alt);
                    if (alt instanceof Parametric && !(tb instanceof Parametric)) {
                        return false;
                    }      
                    if (alt instanceof FunctionType && !(tb instanceof FunctionType)) {
                        return false;
                    }
                    return this.unify(alt, tb);                    
                }
            } else {
                if (tb.contains(ta)) {
                    return false;
                }
                this.constraints[ta] = tb;
                return true;
            }            
        }

        addConstraint(expectedType, newType, id) {
            if (expectedType == undefined) { return true; }
            let type = newType;
            type = type.addId(id);
            return this.unify(expectedType, type);
        }
        unify(ta, tb) {
            if (ta instanceof Primitive) {
                if (tb instanceof Primitive) {
                    return ta.name == tb.name; 
                }
                if (tb instanceof TypeVar) {                    
                    return this.constraint(tb.toString(), ta);
                }
                return false;
            }
            if (ta instanceof TypeVar) {
                if(tb instanceof Primitive) {                    
                    return this.constraint(ta.toString(), tb);
                }
                if (tb instanceof TypeVar) {
                    let tas = ta.toString();
                    let tbs = tb.toString();
                    if (tas == tbs) {
                        return true;
                    }
                    // We  want to pick one to be the primary, so that the secondary just gets replaced by the primary.
                    //The goal is to avoid cycles.
                    if (tas in this.constraints) {
                        if (tbs in this.constraints) {
                            //Both already have constraints. We need to check if they are compatible.
                            //If they are not, then we are done and return false.
                            let converted = this.localConvert(this.constraints[tbs]);
                            let rv = this.unify(this.constraints[tas], converted);
                            if (!rv) {
                                return false;
                            }
                            //If they are compatible, we just pick one to point to the other.
                            return this.constraint(tas, converted);
                        } else {
                            //Easy, ta has constraints, tb does not. We just point tb to ta.
                            return this.constraint(tbs, this.localConvert(this.constraints[tas]));
                        }
                    } else {
                        if (tbs in this.constraints) {
                            //Easy, tb has constraints, ta does not. We just point ta to tb.
                            return this.constraint(tas, this.localConvert(this.constraints[tbs]));
                        } else {
                            //None of them has constraints, we just point one to the other.
                            return this.constraint(tas, tb);
                        }
                    }

                }
                if (tb instanceof Parametric) {
                    return this.constraint(ta.toString(), this.localConvert(tb)); 
                }
                if (tb instanceof FunctionType) {
                    return this.constraint(ta.toString(), this.localConvert(tb));                    
                }
            }
            if (ta instanceof Parametric) {
                if (tb instanceof Primitive) {                    
                    return false;
                }
                if (tb instanceof TypeVar) {                    
                    return this.constraint(tb.toString(), this.localConvert(ta));
                }
                if (tb instanceof Parametric) {
                    if (ta.name != tb.name) {
                        return false;
                    }
                    if (ta.params.length != tb.params.length) {
                        return false;
                    }
                    for (let i = 0; i < ta.params.length; ++i) {
                        if (!this.unify(ta.params[i], tb.params[i])) {
                            return false;
                        }
                    }
                    return true;
                }
                if (tb instanceof FunctionType) {
                    return false;
                }
            }
            if (ta instanceof FunctionType) {
                if (tb instanceof Primitive) {
                    return false;
                }
                if (tb instanceof TypeVar) {
                    return this.constraint(tb.toString(), this.localConvert(ta));
                }
                if (tb instanceof Parametric) {
                    return false;
                }
                if (tb instanceof FunctionType) {
                    return this.unify(ta.from, tb.from) && this.unify(ta.to, tb.to);
                }
            }
        }



    }




    class Error {
        constructor(narg) {
            this.narg = narg;
        }
        toString() {
            return "Error(" + this.narg + ")";
        }
    }

    class BadResult {
        constructor(parent, parent_idx, main, child_idx, level, envt) {
            this.parent = parent;
            this.parent_idx = parent_idx;
            this.main = main;
            this.child_idx = child_idx;
            this.level = level;
            this.envt = envt;
        }
    }


    function holify(prog, childIdx) {
        let probBound = 0.5;
        let hasChildIdx = false;
        if (childIdx !== undefined) {
            hasChildIdx = true;
        }
        function traverse(node, lvl) {
            if (Math.random() > probBound || lvl == 0) {
                if (node instanceof FunN) {
                    let changed = false;
                    let newargs = node.args.map((arg, idx) => {
                        if (hasChildIdx && lvl == 0) {
                            changed = true;
                            if (idx == childIdx) {
                                return traverse(arg, lvl + 1);
                            } else {
                                return new Hole();
                            }
                        } else {
                            let rv = traverse(arg, lvl + 1);
                            if (rv != arg) {
                                changed = true;
                            }
                            return rv;
                        }
                    });
                    if (changed) {
                        let rv;
                        if (node.isParametric()) {
                            rv = (new pFunN(node.name, node.impP, node.absfunP, newargs, node.param));
                        } else {
                            rv = (new FunN(node.name, node.imp, node.absfun, newargs));
                        }                           
                        if (newargs.length == 0) {
                            rv.childstate = st.transition(node.state, rv, 0);
                        }
                        return rv.setState(node.state);
                    } else {
                        return node;
                    }
                }
                if (node instanceof LambdaN) {
                    let newbody = traverse(node.body, lvl + 1);
                    if (newbody != node.body) {
                        return (new LambdaN(newbody)).setState(node.state);
                    } else {
                        return node;
                    }
                }
                return node;
            } else {
                return new Hole();
            }
        }

        let rv = traverse(prog, 0);

        return rv;
    }




    function isBadResult(res) {
        return res instanceof BadResult;
    }

    function isError(res) {
        return res instanceof Error;
    }

    function badResult(parent, parent_idx, child, child_idx, level, envt) {
        return new BadResult(parent, parent_idx, child, child_idx, level, envt);
    }

    function rvError(child_id) {
        return new Error(child_id);
    }

    let KINDS = ["fun", "int", "lambda"];

    let INSTID = 0;

    /**
     * 
     * This is the base class for all AST nodes, which is used to represent the actual programs being synthesized.
     */
    class AST {
        constructor(kind) {
            this.kind = kind;
            this.id = INSTID++;
        }
        traverse(enter, reenter, end) {

        }
        setState(state) {
            this.state = state;
            return this;
        }
        /**
         * If the AST node has a type, this function will apply tc.convert to it.
         * @param {any} tc
         */
        typeConvert(tc) {
            if (this.type) {
                this.type = tc.convert(this.type, this.id);
            }
        }
    }


    class Root extends AST {
        constructor() {
            super("root");
            this.prog = undefined;
        }
        temp(prog) {
            this.prog = prog;
            return this;
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            if (this.prog) {
                this.prog.traverse(enter, reenter, end);
            }
        }
    }

    ROOT = new Root();
    /**
     * Class representing a function node in the AST.
     */
    class FunN extends AST {
        constructor(name, imp, abstract, args) {
            super("fun");
            this.name = name;
            this.imp = imp;
            this.absfun = abstract;
            this.args = args;
        }
        isParametric() {
            return false;
        }
        print() {
            let rv = this.name + "(";
            for (let arg of this.args) {
                rv += arg.print() + ", ";
            }
            rv += ")";
            return rv;
        }
        eval(level, inputs, envt) {
            let actuals = [];
            for (let i in this.args) {
                let arg = this.args[i];
                let actual = arg.eval(level - 1, inputs, envt);
                if (isBadResult(actual)) {
                    return actual;
                }
                if (isError(actual)) {
                    return badResult(this, i, arg, actual.narg, level - 1, envt);
                }
                actuals.push(actual);
            }
            return this.imp.apply(this, actuals);
        }

        abstract(level, inputs, envt) {
            let actuals = [];
            for (let i in this.args) {
                let arg = this.args[i];
                let actual = arg.abstract(level - 1, inputs, envt);
                if (isBadResult(actual)) {
                    return actual;
                }
                if (isError(actual)) {
                    return badResult(this, i, arg, actual.narg, level - 1, envt);
                }
                actuals.push(actual);
            }
            return this.absfun.apply(this, actuals);
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            for (let arg of this.args) {
                arg.traverse(enter, reenter, end);
                if (reenter) { reenter(this); }
            }
            if (end) { end(this) }
        }
        equals(other) {
            if (other.kind == "fun") {
                if (this.name != other.name) { return false; }
                if (this.args.length != other.args.length) { return false; }
                for (let i in this.args) {
                    if (!this.args[i].equals(other.args[i])) {
                        return false;
                    }
                }
            } else {
                return false;
            }
            return true;
        }
        /**
         * Needs to run type convert on the arguments as well, not just itself.
         * @param {any} tc
         */
        typeConvert(tc) {
            super.typeConvert(tc);
            for (let i in this.args) {
                this.args[i].typeConvert(tc);
            }
        }
    }

    /**
     * This class represents a parametric function. This is a function with tunable parameters which need to be discovered by the synthesizer.
     * The big difference with the constructor of FunN is that the imp and abstract functions are replaced by impP and abstractP which 
     * are function generators that take the parameters as input and produce the actual imp and abstract functions as output. These generators are kept around as 
     * impP and abstractP so they can be used to generate new versions of the actual functions with different parameters when needed.
     */
    class pFunN extends FunN {
        constructor(name, impP, abstractP, args, param) {
            super(name, impP(param), abstractP(param), args);
            this.parametric = true;
            this.param = param;
            this.impP = impP;
            this.abstractP = abstractP;
        }
        isParametric() {
            return true;
        }
        print() {
            let rv = this.name + "["+ this.param +"]" + "(";
            for (let arg of this.args) {
                rv += arg.print() + ", ";
            }
            rv += ")";
            return rv;
        }
    }




    class IntN extends AST {
        constructor(val) {
            super("int")
            this.val = val;
        }
        print() {
            return "" + this.val;
        }
        eval(level) {
            return this.val;
        }
        abstract() {
            return this.val;
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            if (end) { end(this) }
        }
        equals(other) {
            if (other.kind != "int") {
                return false;
            }
            return this.val == other.val;
        }
    }

    class LambdaN extends AST {
        constructor(body) {
            super("lambda");
            this.body = body;
        }
        print() {
            return "(λ" + this.body.print() + ")";
        }
        /**
         * The eval for lambda should behave as a built in function, which means if its not a 
         * @param {any} level
         * @param {any} inputs
         * @param {any} envt
         * @returns
         */
        eval(level, inputs, envt) {
            return (x) => {
                // let newenv = [x].concat(envt);
                let newenv = envt.slice(0);
                newenv.push(x);
                let rv = this.body.eval(level - 1, inputs, newenv);
                if (isBadResult(rv)) {
                    return rv;
                }
                if (isError(rv)) {
                    return badResult(this, undefined, this.body, rv.narg, level - 1, newenv);
                }
                return rv;
            }
        }
        abstract(level, inputs, envt) {
            if (this.body instanceof Hole) {
                return new Hole({ t: "fun" });
            } else {
                return (x) => {
                    let newenv = envt.slice(0);
                    newenv.push(x);
                    let rv = this.body.abstract(level - 1, inputs, newenv);
                    if (isBadResult(rv)) {
                        return rv;
                    }
                    if (isError(rv)) {
                        return badResult(this, undefined, this.body, rv.narg, level - 1, newenv);
                    }
                    return rv;
                }
            }
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            this.body.traverse(enter, reenter, end);
            if (reenter) { reenter(this); }
            if (end) { end(this) }
        }
        equals(other) {
            if (other.kind != "lambda") {
                return false;
            }
            return this.body.equals(other.body);
        }
        /**
         * Needs to run type convert on the arguments as well, not just itself.
         * @param {any} tc
         */
        typeConvert(tc) {
            super.typeConvert(tc);
            this.body.typeConvert(tc);            
        }
    }

    class InputN extends AST {
        constructor(name) {
            super("input");
            this.name = name;
        }
        print() {
            return this.name;
        }
        eval(level, inputs, envt) {
            return inputs[this.name];
        }
        abstract(level, inputs, envt) {
            return this.eval(level, inputs, envt);
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            if (end) { end(this) }
        }
        equals(other) {
            if (other.kind != "input") {
                return false;
            }
            return this.name == other.name;
        }
    }

    class deBroujin extends AST {
        constructor(idx, type, pos) {
            super("index");
            this.idx = idx;
            if (type) {
                this.type = type;
            }
            if (pos) {
                this.pos = pos;
            }
        }
        print() {
            return "$" + this.idx;
        }
        eval(level, inputs, envt) {
            return envt[envt.length - 1 - this.idx];
        }
        abstract(level, inputs, envt) {
            return this.eval(level, inputs, envt);
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            if (end) { end(this) }
        }
        equals(other) {
            if (other.kind != "index") {
                return false;
            }
            return this.idx == other.idx;
        }
    }

    class Hole extends AST {
        constructor(type) {
            super("hole");
            if (type) {
                this.type = type;
            }
        }
        print() {
            return "□";
        }
        eval(level, inputs, envt) {
            return this;
        }
        abstract(level, inputs, envt) {
            return this;
        }
        traverse(enter, reenter, end) {
            if (enter) { enter(this); }
            if (end) { end(this) }
        }
        equals(other) {
            if (other.kind != "hole") {
                return false;
            }
            if (this.type || other.type) {
                return false;
            } else {
                return true;
            }
        }
    }

    function isHole(val) {
        return val instanceof Hole;
    }

    function makeHole(type) {
        return new Hole(type);
    }


    const HOLE = new Hole();
    function getLabel(node, stage) {
        let kind = node.kind;
        if (kind == "fun") {
            kind = kind + "/" + node.name;
        }
        if (kind == "input") {
            kind = kind + "/" + node.name;
        }
        if (stage != undefined) {
            kind += "/" + stage;
        }
        return kind;
    }

    function stateToStr(state) {
        return state.depth + ":" + state.grandpa + ":" + state.parentIdx + ":" + state.parent;
    }

    function nextStateToStr(state, node) {
        return (state.depth + 1) + ":" + state.parent + ":" + state.idx + ":" + getLabel(node) ;
    }


    class StatsTracker {
        constructor() {
            this.tracker = {};
        }

        nextConstruct(construct, initial, state, language, extras) {
            let totalLen = language.length + (extras ? extras.length : 0);
            let idx = (construct.pos + 1) % totalLen;
            if (idx == initial) {
                //This means we have wrapped around and we are done.
                return undefined;
            } else {                
                return idx >= language.length ? extras[idx - language.length] : language[idx];
            }
        }

        randomConstruct(state, language, extras) {
            let tstate;
            let key = stateToStr(state);
            if (key in this.tracker) {
                tstate = this.tracker[key];
            }
            function uniform() {
                let el = 0;
                if (extras) {
                    el = extras.length;
                }
                let idx = Math.floor(Math.random() * (language.length + el));
                return idx >= language.length ? extras[idx - language.length] : language[idx];
            }
            if (tstate && tstate.visits > 40) {
                let rnd = Math.random();

                let scores = this.succScores(state, language, extras);
                let total = scores[1];
                if (total == 0) {
                    return uniform();
                }
                scores = scores[0];
                let tally = 0;
                let i = 0;
                for (i = 0; i < language.length; ++i) {
                    tally += scores[i];
                    if (tally / total > rnd) {
                        return language[i];
                    }
                }
                if (extras) {
                    for (let j = 0; j < extras.length; ++j) {
                        tally += scores[i];
                        ++i;
                        if (tally / total > rnd) {
                            return extras[j];
                        }
                    }
                }
                console.log("WTF!!!!");
            } else {
                return uniform();
            }
        }

        succScores(state, language, extras) {
            let rv = [];
            let total = 0;
            function rescale(score) {
                return (Math.tanh(score / 100) + 1) / 2;
            }
            let zeroR = rescale(0);
            for (let i = 0; i < language.length; ++i) {
                let construct = language[i];                
                let totreward = 0;
                let key = nextStateToStr(state, construct);
                let tstate = this.tracker[key];
                
                if (tstate) {
                    totreward += rescale(tstate.reward);
                } else {
                    totreward += zeroR;
                }               
                total += totreward;
                rv.push(totreward);
            }
            if (extras) {
                for (let i = 0; i < extras.length; ++i) {
                    let construct = extras[i];
                    let key = nextStateToStr(state, construct, 0);
                    let tstate = this.tracker[key];
                    let totreward = 0;
                    if (tstate) {
                        totreward += rescale(tstate.reward);
                    }
                    total += totreward;
                    rv.push(totreward);
                }
            }            
            return [rv, total];

        }

        startState() {
            return { parent: "START", parentIdx: 0 , grandpa: "", idx: 0, depth: 0 };
        }
        trackAction(state, node) {
            let key = stateToStr(state);
            let action = getLabel(node);
            if (key in this.tracker) {
                let tr = this.tracker[key];
                tr.visits++;
                if (action in tr.actions) {
                    tr.actions[action]++;
                } else {
                    tr.actions[action] = 1;
                }
            } else {
                let tr = {
                    visits: 1, reward: 0, scores: 0, actions: {}
                }
                tr.actions[action] = 1;
                this.tracker[key] = tr;
            }
        }
        transition(state, node, childidx) {
            childidx = childidx || 0;
            let action = getLabel(node);

            return { parent: action, grandpa: state.parent, parentIdx:state.idx , idx: childidx, depth: state.depth + 1, pred: state };
        }
        failedAction(state, action) {
            //console.log(stateToStr(state), getLabel(action));
        }
        scoreTree(node, score) {        
            if (score <= 0) { return; }
            let tracker = this.tracker;
            function scoreF(key) {
                if (key in tracker) {
                    let q = tracker[key];
                    if (score > q.reward) {
                        q.reward = score;
                    }
                      // q.reward =  (q.reward * q.scores + score) / (q.scores + 1);
                    q.scores++;
                } else {
                    let tr = {
                        visits: 1, reward: score, scores: 1, actions: {}
                    };
                    tracker[key] = tr;
                }
            }
            node.traverse((n) => {
                let key = stateToStr(n.state);
                scoreF(key);
                if (n.childstate) {
                    key = stateToStr(n.childstate);
                    scoreF(key);
                }
            });
        }
        failedState(state) {
            return;
            let score = -100;
            let tracker = this.tracker;
            function scoreF(key) {
                if (key in tracker) {
                    let q = tracker[key];
                    q.reward = (q.reward * q.scores + score) / (q.scores + 1);
                    q.scores++;
                } else {
                    let tr = {
                        visits: 1, reward: score, scores: 1, actions: {}
                    };
                    tracker[key] = tr;
                }
            }
            let key = stateToStr(state);
            scoreF(key);
            if (state.pred) {
                this.failedState(state.pred);
            }
        }
    }




    class ConstraintChecker {
        constructor() {
            this.constraints = {};
            this.searchState = [];
        }

        print() {
            function printAll(set, indent) {
                let rv = "";
                for (let key in set) {
                    let lbl = "";
                    if ('val' in set[key]) {
                        lbl = "." + set[key].val;
                    }
                    if (set[key].endpt) {
                        lbl += "!";
                    }
                    rv += indent + key + lbl + "->{\n" + printAll(set[key].succ, indent + "  ") + indent + "}\n";
                }
                return rv;
            }
            return printAll(this.constraints, "");
        }



        addConstraint(badRes, envt, limit) {
            if (limit == undefined) {
                limit = 1000;
            }

            let lst = [];


            function enter(node) {
                let kind = getLabel(node, "enter");
                let entry = { kind: kind, label: "enter" };
                if (node.kind == "index") {
                    let idx = envt.length - 1 - node.idx;
                    if (idx < envt.length) {
                        entry.val = envt[idx];
                        entry.kind += "." + entry.val.toString();
                    } else {
                        console.log("Should never happen!");
                    }
                }
                if (node.kind == "lambda") {
                    envt.push(NOVALUE);
                }
                lst.push(entry);
            }
            function reenter(node) {
                let kind = getLabel(node, "return");
                let entry = { kind: kind, label: "return" };
                lst.push(entry);
            }
            function exit(node) {
                if (node.kind == "lambda") {
                    envt.pop();
                }
            }

            if (badRes instanceof BadResult) {
                envt = badRes.envt;
                enter(badRes.main);
                let hole = new Hole();
                for (let i = 0; i < badRes.child_idx; ++i) {
                    enter(hole);
                    reenter(badRes.main);
                }
                badRes.main.args[badRes.child_idx].traverse(enter, reenter, exit);
            } else {
                badRes.traverse(enter, reenter, exit);
            }


            let lastEnter = 0;
            for (let i = 0; i < lst.length; ++i) {
                if (lst[i].label == "enter" && lst[i].kind != "hole/enter") {
                    lastEnter = i;
                }
            }
            lst[lastEnter].endpt = true;

            if (lastEnter > limit) {
                return;
            }

            lst = lst.slice(0, lastEnter + 1);

            let constraints = this.constraints;

            for (let entry of lst) {
                if (entry.kind in constraints) {
                    if (entry.endpt) {
                        constraints[entry.kind].endpt = true;
                    }
                    constraints = constraints[entry.kind].succ;
                } else {
                    constraints[entry.kind] = entry;
                    entry.succ = {};
                    constraints = entry.succ;
                }
            }
        }

        /**
         * 
         * 
         * @param {any} nodeType
         * @param {any} id
         * @param {any} stage Can be "enter" or "return"
         * @returns 
         */
        checkStep(node, envt) {
            let stage = "enter";
            let label = getLabel(node, stage);
            let label2 = undefined;
            if (node.kind == "index") {
                if (envt && envt.length > node.idx) {
                    label2 = label + "." + envt[envt.length - 1 - node.idx];
                }

                label = label + "." + NOVALUE;
                //if the node is "lambda, we need to check against two labels, .val and .NOVALUE";
            }
            for (let st of this.searchState) {
                let state = st.state;
                if (label in state.succ) {
                    if (state.succ[label].endpt) {
                        return false;
                        //if (label == "index/enter") {
                        //    //only return false if the re is an envt and the values match.
                        //    if (state.succ[label].val == NOVALUE ||
                        //        (envt && envt[envt.length - 1 - node.idx] == state.succ[label].val)) {
                        //        return false;
                        //    }
                        //} else {
                        //    //If this is an endpoint, we can't go any further.
                        //    return false;
                        //}

                    }
                }
                if (label2 && label2 in state.succ) {
                    if (state.succ[label2].endpt) {
                        return false;
                    }
                }
            }
            return true;
        }
        reset() {
            //console.log("Reset");
            this.searchState = [];
        }
        advance(node, envt) {
            //console.log("advance", node.print? node.print(): node);
            let stage = "enter";
            let label = getLabel(node, stage);
            let label2 = undefined;
            if (node.kind == "index") {
                if (envt && envt.length > node.idx) {
                    label2 = label + "." + envt[envt.length - 1 - node.idx];
                }

                label = label + "." + NOVALUE;
                //if the node is "lambda, we need to check against two labels, .val and .NOVALUE";
            }
            //First, see which of the current search states can be advanced from the current node.
            let oldState = this.searchState;
            let newSearchState = [];
            for (let st of this.searchState) {
                let state = st.state;
                for (let nxtlabel in state.succ) {
                    let nxt = state.succ[nxtlabel];
                    if (nxt.kind == label) {
                        newSearchState.push({ state: nxt, instance: node.id }); //For regular nodes, instance is the id of the node.                                        
                    }
                    if (label2 && nxt.kind == label2) {
                        newSearchState.push({ state: nxt, instance: node.id }); //For regular nodes, instance is the id of the node.                                        
                    }
                    if (nxt.kind == "hole/enter") {
                        newSearchState.push({ state: nxt, instance: st.instance }); //For hole nodes, it's the id of the parent that we go back to.
                    }
                }
                if (state.kind == "hole/enter") {
                    newSearchState.push(st);
                }
            }
            this.searchState = newSearchState;
            //Then add new search states for the current node.
            if (label in this.constraints) {
                let current = this.constraints[label];
                this.searchState.push({ state: current, instance: node.id });
            }
            return oldState;
        }

        retract(oldState) {
            //console.log("retract", oldState);
            this.searchState = oldState;
        }
        goback(node) {
            //console.log("goback", node.print ? node.print() : node);
            let stage = "return";
            let label = getLabel(node, stage);
            let newSearchState = [];
            for (let st of this.searchState) {
                let state = st.state;
                //If the current node st is a hole node, then we either
                //stay in the hole node or advance if nxt is a return node and node.id matches the
                //id of the st node. 
                if (state.kind == "hole/enter") {
                    if (label in state.succ) {
                        let nxt = state.succ[label];
                        if (st.instance == node.id) {
                            newSearchState.push({ state: nxt, instance: node.id });
                        } else {
                            newSearchState.push(st);
                        }
                    } else {
                        newSearchState.push(st);
                    }
                } else {
                    //if we are not in a hole node, we just advance if the label matches.
                    if (label in state.succ) {
                        let nxt = state.succ[label];
                        newSearchState.push({ state: nxt, instance: node.id });
                    }
                }
            }
            this.searchState = newSearchState;
        }

    }




    function synthesize(inputspec, examples, language, scoreOutputs, threshold, bound, N) {
        let cc = new ConstraintChecker();
        let st = new StatsTracker();
        let tc = new TypeChecker();
        function randomProgram(language, bound, extras, localenv, state, expectedType, initialBound) {
            if (initialBound == undefined) {
                initialBound = bound;
            }
            if (state == undefined) {
                state = st.startState();
            }
            
            let construct = st.randomConstruct(state, language, extras);   
            let initialConst = construct.pos;

            function advanceConstruct() {
                if (bound <= 0) {
                    while (construct && (construct.kind == "lambda" || (construct.kind == "fun" && construct.nargs > 0))) {
                        st.failedAction(state, construct);
                        construct = st.nextConstruct(construct, initialConst, state, language, extras);
                    }
                }
                if (construct) {
                    let chk = cc.checkStep(construct, localenv);
                    chk = chk && tc.checkStep(construct, expectedType);
                    let i = 0;
                    while (!chk && construct) {
                        st.failedAction(state, construct);
                        ++i;
                        construct = st.nextConstruct(construct, initialConst, state, language, extras);
                        if (bound <= 0) {
                            while (construct && (construct.kind == "lambda" || (construct.kind == "fun" && construct.nargs > 0))) {
                                st.failedAction(state, construct);
                                construct = st.nextConstruct(construct, initialConst, state, language, extras);
                            }
                        }
                        if (construct) {
                            chk = cc.checkStep(construct, localenv);
                            chk = chk && tc.checkStep(construct, expectedType);
                        }                        
                    }
                } 
            }


            advanceConstruct();

                       
            if (!construct) {
                st.failedState(state);
                return new Error(0); // Error 0 means that this node was unsatisfiable. 
            }
            let oldState;
            let oldTypes = tc.checkpoint();

            function fleshOutConstruct(construct) {
                if (construct.kind == "fun") {
                    let n = construct.nargs;
                    let args = [];
                    let rv;
                    if (construct.parametric) {
                        let param = construct.paramInit();
                        rv = new pFunN(construct.name, construct.imp, construct.abstract, args, param);
                    } else {
                        rv = new FunN(construct.name, construct.imp, construct.abstract, args);
                    }
                    oldState = cc.advance(rv, localenv);
                    if (!tc.addConstraint(expectedType, construct.returntype, rv.id)) {
                        return new Error(0);
                    }
                    rv.state = state;                   
                    st.trackAction(state, rv);
                    if (n == 0) {
                        rv.childstate = st.transition(state, rv, 0);
                    }
                    for (let i = 0; i < n; ++i) {
                        let newstate = st.transition(state, rv, i);
                        let arg = randomProgram(language, bound - 1, extras, localenv, newstate, tc.convert(construct.typeargs[i], rv.id), initialBound);
                        cc.goback(rv);
                        if (arg instanceof Error) {
                            //If i==0 and arg.narg == 0, it means that this whole node is unsatisfiable. 
                            if (i == 0 && arg.narg == 0) {
                                return arg;
                            } else {
                                //The farther we get from zero, the more likely it is that random regeneration might fix things.
                                return new Error(arg.narg + 1);
                            }                            
                        }
                        args.push(arg);
                    }
                    //console.log("Returning fun", bound);
                    return rv;
                }
                if (construct.kind == "int") {
                    let randval = Math.floor(Math.random() * (construct.range[1] - construct.range[0] + 1) + construct.range[0]);
                    let rv = new IntN(randval);                                        
                    oldState = cc.advance(rv, localenv);
                    rv.state = state;
                    rv.childstate = st.transition(state, rv, 0);
                    if (!tc.addConstraint(expectedType, construct.type, rv.id)) {
                        return new Error(0);
                    }
                    return rv;
                }
                if (construct.kind == "lambda") {
                    let args;
                    let rv = new LambdaN(HOLE);
                    rv.state = state;
                    oldState = cc.advance(rv, localenv);
                    if (!expectedType) {
                        //should not produce lambdas if we don't know what type the argument is going to be.
                        return new Error(0);
                    }
                    let typeFrom =  expectedType.from ;
                    let typeTo = expectedType.to ;
                    if (extras) {
                        let idx = extras.length;     
                        args = extras.map((dbi, i)=> new deBroujin(idx-i, dbi.type, dbi.pos) );
                        args.push(new deBroujin(0, typeFrom, language.length+idx));
                    } else {
                        args = [new deBroujin(0, typeFrom, language.length)];
                    }
                    
                    st.trackAction(state, rv);
                    let newstate = st.transition(state, rv, 0);
                    let body = randomProgram(language, bound - 1, args, undefined, newstate, typeTo, initialBound);
                    cc.goback(rv);
                    rv.body = body;
                    if (body instanceof Error) {
                        return body;
                    }
                    return rv;
                }
                if (construct.kind == "input") {
                    oldState = cc.advance(construct, localenv);                    
                    if (!tc.addConstraint(expectedType, construct.type)) {
                        return new Error(0);
                    }
                    let rv = new InputN(construct.name);
                    rv.setState(state);
                    rv.childstate = st.transition(state, rv, 0);
                    st.trackAction(state, rv);
                    return rv;
                }
                if (construct.kind == "index") {
                    let rv = new deBroujin(construct.idx);
                    oldState = cc.advance(rv, localenv);
                    if (!tc.addConstraint(expectedType, construct.type, rv.id)) {
                        return new Error(0);
                    }                                        
                    st.trackAction(state, rv);
                    rv.setState(state);
                    rv.childstate = st.transition(state, rv, 0);
                    return rv;
                }
            }
            let attempts = 0;
            while (construct) {
                ++attempts;
                let out = fleshOutConstruct(construct);
                if (out instanceof Error) {
                    if (out.narg == 0) {
                        //This means that this construct failed conclusively, so we should continue cycling through constructs until
                        //we run out, at which point we return 0.
                        st.failedAction(state, construct);
                        construct = st.nextConstruct(construct, initialConst, state, language, extras);
                        advanceConstruct();                   
                        cc.retract(oldState);
                        tc.revert(oldTypes);
                    } else {
                        //This means that this construct failed, but it might be fixable by regenerating it.
                        //We flip a biased coin to either retry at this level or go back to the previous level.
                        //The lower the bound, the more likely we are to go back to the previous level.
                        let mr = Math.random();
                        if (initialBound == bound || (mr > 1 / Math.pow(2, bound) && attempts < 5)) {
                            //retry at this level. Since we retry with random, we re-initialize the initial construct.
                            construct = st.randomConstruct(state, language, extras);
                            initialConst = construct.pos;
                            advanceConstruct();
                            cc.retract(oldState);
                            tc.revert(oldTypes);
                        } else {
                            return new Error(out.narg + 1);
                        }
                    }
                } else {

                    out.type = expectedType;
                    out.typeConvert(tc);                    
                    return out;
                }
            }
            return new Error(0);
        }


        function runOrLocalize(examples, prog, bound) {
            let outputs = [];
            let bestBad = undefined;
            let idx = 0;
            let badIdx = -1;
            for (let example of examples) {
                let out = prog.eval(bound, example.in, []);
                if (isError(out)) {
                    out = badResult(undefined, -1, prog, out.narg, bound, []);
                }
                if (isBadResult(out)) {
                    badIdx = idx;
                    bestBad = out;
                    break;
                }
                outputs.push(out);
                ++idx;
            }
            if (bestBad) {
                let main = bestBad.main;
                //console.log("Bad Child", main.print());
                for (let i = 0; i < 5; ++i) {
                    let light = holify(main, bestBad.child_idx);

                    let lightOut = light.abstract(bound, examples[badIdx].in, []);

                    // console.log("Light Child", light.print(), "=>", lightOut);
                    if (isError(lightOut) || isBadResult(lightOut)) {
                        main = light;
                    }
                }

                if (main == bestBad.main) {
                    log(2, "Best main", bestBad);
                    cc.addConstraint(bestBad);
                } else {
                    log(2, "Best main", main.print());
                    cc.addConstraint(main, bestBad.envt);
                }


                return bestBad;
            }
            return outputs;
        }

        /**
         * //We want to replace the bad node identified by badResult and replace it with a new random node.
         * @param {any} prog
         * @param {any} badRes
         */
        function randomizeLocalizedError(language, prog, badRes, bound) {
            //console.log(badRes);
            //console.log(prog.print());

            function makeReplacement(node, idx, replacement) {
                if (idx === undefined) {
                    node.body = replacement;
                } else {
                    node.args[idx] = replacement;
                }
            }

            function replaceRandomChild(prog) {
                let lidx = Math.floor(Math.random() * prog.args.length);
                cc.reset();
                cc.advance(prog);
                for (let i = 0; i < lidx; ++i) {
                    cc.advance(prog.args[i]);
                    cc.goback(prog);
                }
                st.trackAction(prog.state, prog);
                let replacement = randomProgram(language, bound - 1, [], st.transition(prog.state, prog, lidx));
                if (replacement instanceof Error) {
                    console.log("randomizeLocalizedError1 FAILED")
                    return false;
                }

                //console.log("Before replacement ", prog.print());
                prog.args[lidx] = replacement;
                return true;
            }


            cc.reset();
            cc.advance(badRes.main);
            for (let i = 0; i < badRes.child_idx; ++i) {
                cc.advance(badRes.main.args[i]);
                cc.goback(badRes.main);
            }
            let idx = -1;
            let newEnvt = badRes.envt.map((x) => { ++idx; return new deBroujin(idx); });
            st.trackAction(badRes.main.state, badRes.main);
            let replacement = randomProgram(language, badRes.level - 1, newEnvt, badRes.envt, st.transition(badRes.main.state, badRes.main, badRes.child_idx));
            if (replacement instanceof Error) {
                //Local fix did not work. We need a more global fix. We'll try replacing the parent.
                cc.reset();
                if (badRes.parent) {
                    cc.advance(badRes.parent);
                    for (let i = 0; i < badRes.parent_idx; ++i) {
                        cc.advance(badRes.parent.args[i]);
                        cc.goback(badRes.parent);
                    }
                    st.trackAction(badRes.parent.state, badRes.parent);
                    let replacement2 = randomProgram(language, badRes.level, newEnvt, badRes.envt, st.transition(badRes.parent.state, badRes.parent, badRes.parent_idx));
                    if (replacement2 instanceof Error) {
                        if (prog instanceof FunN) {
                            for (let i = 0; i < 5; ++i) {
                                if (replaceRandomChild(prog)) {
                                    return true;
                                }
                            }
                            return null;

                            //console.log("After replacement ", prog.print());
                        } else {
                            console.log("randomizeLocalizedError2 FAILED")
                            return null;
                        }
                    } else {
                        //console.log("Replacement2 ", replacement2.print());
                        makeReplacement(badRes.parent, badRes.parent_idx, replacement2);
                    }
                } else {
                    if (prog instanceof FunN) {
                        for (let i = 0; i < 5; ++i) {
                            if (replaceRandomChild(prog)) {
                                return true;
                            }
                        }
                        return null;
                    }
                }


            } else {
                //console.log("Replacement ", replacement.print());
                makeReplacement(badRes.main, badRes.child_idx, replacement);
            }

        }

        function solprint() {
            let sol = this;
            return sol.status + " cost:" + (sol.cost) + " score: " + sol.score + "\t" + sol.prog.print();

        }


        function smcSynth(language, examples, prog, bound, budget) {
            let beamsize = 20;
            let out; 
            const initBudget = budget;
            let score; 
            let workList = [];
            let bestProgram;
            let bestScore = 100000;
            let totalScore = 0;
            function mass(score) {
                return Math.exp(-3 * score);
            }
            for (let i = 0; i < beamsize; ++i) {
                tc.reset();
                let newprog = randomProgram(language, bound);
                out = runOrLocalize(examples, newprog, bound);
                score = scoreOutputs(examples, out);
                st.scoreTree(newprog, (1 - score) * 100);
                workList.push({ prog: newprog, score: score });
                if (score < bestScore) {
                    bestScore = score;
                    bestProgram = newprog;
                }
                totalScore += mass(score);
            }
            budget -= beamsize;
            workList.sort((a, b) => a.score - b.score);
            while (budget > 0) {                
                let candidates = [];
                for (let idx in workList) {
                    let c = workList[idx];
                    let n = Math.ceil((beamsize * mass(c.score)) / totalScore)
                    for (let i = 0; i < n; ++i) {
                        if (candidates.length < beamsize) {
                            candidates.push(c);
                        }                        
                    }
                }
                totalScore = 0;
                workList = candidates.map((entry) => {
                    tc.reset();
                    let adjusted = randomizeClone(language, entry.prog, bound);
                    if (adjusted instanceof Error) {
                        console.log("randomAndHillClimb1 FAILED")
                        return adjusted;
                    }
                    out = runOrLocalize(examples, adjusted, bound);
                    score = scoreOutputs(examples, out);
                    st.scoreTree(adjusted, (1 - score) * 100);
                    totalScore += mass(score);
                    if (score < bestScore) {
                        bestScore = score;
                        bestProgram = adjusted;
                    }
                    return { prog: adjusted, score: score };
                });
                
                budget -= beamsize;
                if (bestScore < threshold) {
                    //All outputs correct enough, we are done!
                    //return an object with the program, the status, the score, and the budget. 
                    //it also has a print function that returns a string representation of the object.
                    return { prog: bestProgram, status: "CORRECT", score: bestScore, cost: initBudget - budget, initBudget: initBudget, crashing: 0, print: solprint };
                }
                workList.sort((a, b) => a.score - b.score);

                //let disp = workList.reduce((acc, b) => acc + "" + b.score + ",", "");
                //console.log(disp);

            }
            return { prog: bestProgram, status: "INCORRECT", score: bestScore, cost: initBudget - budget, initBudget: initBudget, crashing: 0, print: solprint };


        }




        /**
         * The general strategy for this function is that we keep a worklist of N programs sorted from best to worst.
         * At each step, we randomly pick a program from the worklist. If the program is in the bottom half (bad), 
         * we simply replace it with a new random program. If the program is in the top half (good), we wiggle it 
         * a little, and if it improves, we add it in place of the worse program, and if it doesn't improve, we drop it.
         * @param {any} language
         * @param {any} examples
         * @param {any} prog
         * @param {any} bound
         * @param {any} budget
         */
        function randomAndHillClimb(language, examples, prog, bound, budget) {
            let beamsize = 10;
            let out = runOrLocalize(examples, prog, bound);
            const initBudget = budget;

            if (isBadResult(out)) {
                console.log(prog.print());
                throw "Should never happen";
            }
            let score = scoreOutputs(examples, out);
            let workList = [];
            for (let i = 0; i < beamsize; ++i) {
                tc.reset();
                let newprog = randomProgram(language, bound);
                out = runOrLocalize(examples, newprog, bound);
                score = scoreOutputs(examples, out);
                st.scoreTree(newprog, (1 - score) * 100);
                workList.push({ prog: newprog, score: score });
            }
            budget -= beamsize;
            // sort so that the lowest score is workList[0]
            workList.sort((a, b) => a.score - b.score); 

            function replaceWorst(adjusted, score) {
                for (let i = 0; i < beamsize; ++i) {
                    if (workList[i].score == workList[beamsize - 1].score) { // reached the first worst one.
                        // If i == beamsize - 1, we are replacing the last one in the list.
                        //otherwise, we pick one at random between i and beamsize - 1.
                        if (i == beamsize - 1) {
                            workList[i] = { prog: adjusted, score: score };
                        } else {
                            //pick one at random between i and beamsize - 1.
                            let idx = Math.floor(Math.random() * (beamsize - i)) + i;
                            workList[idx] = { prog: adjusted, score: score };
                        }
                        break;
                    }
                }
            }

            while (budget > 0) {
                tc.reset();
                --budget;
                let idx = Math.floor(Math.random() * beamsize);
                let prog = workList[idx].prog;
                log(3, "original one " + idx + ":" + prog.print() + " score" + workList[idx].score);
                const probReplace = 0.5;
                if (Math.random() < probReplace) {
                    let adjusted = randomProgram(language, bound);
                    if (adjusted instanceof Error) {
                        console.log("randomAndHillClimb1 FAILED")
                        return;
                    }
                    out = runOrLocalize(examples, adjusted, bound);
                    score = scoreOutputs(examples, out);
                    st.scoreTree(adjusted, (1 - score) * 100);
                    log(3, "After mod ", adjusted.print(), "score", score);
                    //if the score is better than the worst one in the list (list is sorted from best to worst), we replace something.
                    //We want to replace the worst on the list, but if there are multiple worst ones, we want to replace one of them at random.
                    if (score < 1 && (score <= workList[beamsize - 1].score  || Math.random() < 0.1  )) {
                        replaceWorst(adjusted, score);                                                
                    }
                } else {
                    //We don't replace, we improve.
                    let adjusted = randomizeClone(language, workList[idx].prog, bound);
                    if (adjusted instanceof Error) {
                        console.log("randomAndHillClimb1 FAILED")
                        return;
                    }
                    out = runOrLocalize(examples, adjusted, bound);
                    score = scoreOutputs(examples, out);
                    st.scoreTree(adjusted, (1 - score) * 100);
                    log(3, "After mod ", adjusted.print(), "score", score);
                    if (score < workList[idx].score) {// good. The new program is better than the old one. replace
                        workList[idx] = { prog: adjusted, score: score };
                    } else if (score < workList[beamsize - 1].score) {
                        //bad. The new program is worse than the old one, but better than the worst one in the list.
                        //workList[beamsize - 1] = { prog: adjusted, score: score };
                    } // otherwise just drop the adjusted one.
                }



                if (idx < beamsize / 2) { // testing one of the good ones                    
                   
                } else {
                    // testing one of the bad ones
                    
                }   
                workList.sort((a, b) => a.score - b.score); 
                if (workList[0].score < threshold) {
                    //All outputs correct enough, we are done!
                    //return an object with the program, the status, the score, and the budget. 
                    //it also has a print function that returns a string representation of the object.
                    return { prog: workList[0].prog, status: "CORRECT", score: workList[0].score, cost: initBudget - budget, initBudget: initBudget, crashing: 0, print: solprint };
                }
            }
            return { prog: workList[0].prog, status: "INCORRECT", score: workList[0].score, cost: initBudget - budget, initBudget: initBudget, crashing: 0, print: solprint };
        }



        /**
         * This is a synthesis strategy that randomly generates programs until it finds one that works.
         * @param {any} language
         * @param {any} examples
         * @param {any} prog
         * @param {any} bound
         * @param {any} budget
         * @returns { prog: bestSolution, status: "INCORRECT"|"CORRECT", score: bestScore, budget: 0, crashing: how many times has it crashed?, print: solprint };
         */
        function randomRandom(language, examples, prog, bound, budget) {
            let bestSolution = undefined;
            let bestOutput = undefined;
            let bestScore = 100000;//score is an error, so bigger is worse.
            let out = runOrLocalize(examples, prog, bound);
            const initBudget = budget;
            
            let crashing = 0;
            while (budget > 0) {
                if (isBadResult(out)) {
                    console.log(prog.print());
                    throw "Should never happen";
                } else {
                    let score = scoreOutputs(examples, out)
                    st.scoreTree(prog, (1 - score) * 100);
                    log(1, budget + " Score:", score, prog.print());
                    if (score < threshold) {
                        //All outputs correct enough, we are done!
                        //return an object with the program, the status, the score, and the budget. 
                        //it also has a print function that returns a string representation of the object.
                        return { prog: prog, status: "CORRECT", score: score, cost: initBudget - budget, initBudget: initBudget, crashing: crashing, print: solprint };
                    } else {
                        if (score < bestScore || (score == bestScore && Math.random() > 0.75)) {
                            //If we are better than the best score, we don't want to lose this solution.
                            bestScore = score;
                            bestSolution = prog;
                            bestOutput = out;
                            log(1, "New best solution", score, bestSolution.print());
                        }
                        tc.reset();
                        prog = randomProgram(language, bound); //randomizeClone(language, prog, bound);
                        --budget;
                        out = runOrLocalize(examples, prog, bound);
                    }

                }

            }
            return { prog: bestSolution, status: "INCORRECT", score: bestScore, cost: initBudget, initBudget: initBudget, crashing: crashing, print: solprint };            
        }



        function runAndFixB(language, examples, prog, bound, budget) {
            let bestSolution = undefined;
            let bestOutput = undefined;
            let bestScore = 100000;//score is an error, so bigger is worse.
            let out = runOrLocalize(examples, prog, bound);
            function solprint() {
                let sol = this;
                 return sol.prog.print() + " : " + sol.status + " : " +  sol.budget + " crashing:" + sol.crashing;

            }
            let crashing = 0;
            while (budget > 0) {
                if (isBadResult(out)) {
                    ++crashing;
                    st.scoreTree(prog, -100);
                    //In this case, an error was localized to an AST node.
                    //Always re-randomize the AST node with the error.                
                    log(1, budget + " Bad candidate          ", prog.print());
                    randomizeLocalizedError(language, prog, out, bound);//in-place mutation of prog.
                    log(2, budget + " Rerandomized candidate:", prog.print());
                    //Could it ever modify bestProg? no, because bestProg works, and this only runs if prog doesn't work.
                    --budget;
                    out = runOrLocalize(examples, prog, bound);

                } else {
                    let score = scoreOutputs(examples, out)
                    st.scoreTree(prog, (1 - score) * 100);
                    log(1, budget + " Score:", score, prog.print());
                    if (score < threshold) {
                        //All outputs correct enough, we are done!
                        //return an object with the program, the status, the score, and the budget. 
                        //it also has a print function that returns a string representation of the object.
                        return { prog: prog, status: "CORRECT", score: score, budget: budget, crashing:crashing, print:solprint };
                    } else {
                        cc.addConstraint(ROOT.temp(prog), [], 10);
                        if (score < bestScore || (score == bestScore && Math.random() > 0.75)) {
                            //If we are better than the best score, we don't want to lose this solution.
                            bestScore = score;
                            bestSolution = prog;
                            bestOutput = out;
                            log(1, "New best solution", score, bestSolution.print());
                        }
                        log(2, "Before randomization", prog.print());
                        let newprog = randomizeClone(language, prog, bound);
                        log(2, "After randomization", newprog.print());
                        --budget;
                        out = runOrLocalize(examples, newprog, bound);
                        if (isBadResult(out)) {
                            st.scoreTree(newprog, -100);
                            prog = newprog;//make prog now equal the new prog and go back to the start of the loop.
                        } else {
                            //
                            let newscore = scoreOutputs(examples, out);
                            st.scoreTree(newprog, (1 - newscore) * 100);
                            if (newscore <= score) {
                                //At least we made an improvement; make prog = newprog and keep improving.
                                log(2, "New candidate", score, newprog.print());
                                prog = newprog;
                            } else {
                                prog = bestSolution; //could bestSolution be undefined? No.  
                                out = bestOutput;
                            }
                        }
                    }
                }
            }
            return { prog: bestSolution, status: "INCORRECT", score: bestScore, budget: 0, crashing: crashing, print:solprint };            
        }

        /**
         * Recursively traverse the AST of prog and with some probability replace a node with a new random node.
         * @param {any} language
         * @param {any} prog
         * @param {any} bound
         * @returns
         */
        function randomizeClone(language, prog, bound) {
            let probBound = Math.pow(1.5, -bound);
            cc.reset();
            function traverse(node, lbound, envt, expectedType) {
                if (Math.random() > probBound) {
                    cc.advance(node);
                    if (node instanceof FunN) {
                        let changed = false;                        
                        let newargs = node.args.map((arg) => {
                            if (changed) {
                                cc.advance(arg);
                                cc.goback(node);
                                return arg;
                            } else {
                                let rv = traverse(arg, lbound - 1, envt, arg.type);
                                cc.goback(node);
                                if (rv != arg) {
                                    changed = true;
                                }
                                return rv;
                            }                            
                        });
                        if (changed) {
                            let rv;
                            if (node.isParametric()) {
                                rv = (new pFunN(node.name, node.impP, node.absfunP, newargs, node.param));
                            } else {
                                rv = (new FunN(node.name, node.imp, node.absfun, newargs));
                            }                            
                            if (newargs.length == 0) {
                                rv.childstate = st.transition(node.state, rv, 0);
                            }
                            rv.type = expectedType;
                            return rv.setState(node.state);

                        } else {
                            return node;
                        }
                    }
                    if (node instanceof LambdaN) {
                        let idx = envt.length;
                        let newenvt = envt.map((dbi, i) => new deBroujin(idx - i, dbi.type, dbi.pos));
                        let argtype = node.type ? node.type.from : undefined;
                        newenvt.push(new deBroujin(0, argtype, language.length+envt.length));
                        let newbody = traverse(node.body, lbound - 1, newenvt, node.body.type);
                        cc.goback(node);
                        if (newbody != node.body) {
                            let rv = (new LambdaN(newbody)).setState(node.state);
                            rv.type = expectedType;
                            return rv;
                        } else {
                            return node;
                        }
                    }
                    return node;
                } else {
                    let rv = randomProgram(language, lbound, envt, undefined, node.state, expectedType, lbound);
                    if (rv instanceof Error) {
                        cc.advance(node);
                        return node;
                    }
                    if (rv.equals(node)) {
                        return node;
                    }
                    return rv;
                }
            }
            let rv = traverse(prog, bound, []);
            while (rv == prog) {
                probBound = probBound * 1.5;
                rv = traverse(prog, bound, []);
            }
            return rv;
        }


        function processLanguage(language, inputspec) {
            let rv = language.map(
                (c, idx) => {
                    if (c.kind == "fun") {
                        let type = c.type;
                        let nargs = c.nargs;
                        let typeargs = [];
                        for (let i = 0; i < nargs; ++i) {
                            typeargs.push(type.from);
                            type = type.to;
                        }
                        c.typeargs = typeargs;
                        c.returntype = type;                        
                        return c;
                    } if (c.kind == "int") {
                        c.type = new Primitive("int");                        
                        return c;
                    } else {                        
                        return c;
                    }
                }
            );
            rv = rv.concat(inputspec);
            rv.map((c, idx) => { c.pos = idx; return c; });
            return rv;
        }



        let langWithInputs = processLanguage(language, inputspec);

        let rp = randomProgram(langWithInputs, bound);     



        let synthesizer = smcSynth; // randomAndHillClimb; // randomRandom;

        let rv = synthesizer(langWithInputs, examples, rp, bound, N);

        return rv;

    }
    //Score ranges from 0 for perfect match to 1 for bad match.

    function score(examples, outputs) {
        function singleOutput(example, output) {
            //If example and output are of wong type DISTANCE = 100;
            if (typeof (example) != typeof (output)) {
                return 100;
            }
            //If example and output are both array type, get the average distance of their elements.
            if (example instanceof Array && output instanceof Array) {
                let minidx = Math.min(example.length, output.length);
                let maxidx = Math.max(example.length, output.length);
                let totdist = 0;
                for (let i = 0; i < minidx; ++i) {
                    let dist = singleOutput(example[i], output[i]);
                    totdist += dist;
                }
                totdist += (maxidx - minidx) * 100;
                return totdist / maxidx;
            }
            //If they are both scalars, compute a true dist:
            if (example == output) {
                return 0;
            }
            if (example != output) {
                return 50;
            }
        }
        let output = 0;
        for (let idx in outputs) {
            output += singleOutput(examples[idx].out, outputs[idx]) / 100;
        }
        return output / outputs.length;
    }





    // Export for Node.js (CommonJS)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { synthesize, rvError, isError, isBadResult, isHole, makeHole, score, Tp };
    }
    // Export for browsers (ES6 Modules)
    else if (typeof exports === 'undefined') {
        window.synlib = { synthesize, rvError, isError, isBadResult, isHole, makeHole, score, Tp };
    }

})();