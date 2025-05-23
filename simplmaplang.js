let synthesize;
let isHole;
let makeHole;
let score;
let rvError;
let isError;
let isBadResult;
let Tp;

if (typeof module !== 'undefined' && module.exports) {
    let synlib = require('./synlib.js');
    synthesize = synlib.synthesize;
    isHole = synlib.isHole;
    makeHole = synlib.makeHole;
    score = synlib.score;
    rvError = synlib.rvError;
    isError = synlib.isError;
    isBadResult = synlib.isBadResult;
Tp = synlib.Tp;
}
// Export for browsers (ES6 Modules)
else if (typeof exports === 'undefined') {
    synthesize = synlib.synthesize;
    isHole = synlib.isHole;
    makeHole = synlib.makeHole;
    score = synlib.score;
    rvError = synlib.rvError;
    isError = synlib.isError;
    isBadResult = synlib.isBadResult;
Tp = synlib.Tp;
}


/**
 * 
 * A language is a list of language elements, which can be a "fun", an "int", or "lambda".
 * An implementation of a function should return either a regular value (if the computation succeeds), 
 * an rvError(n) if the computation fails and the failure can be attributed to argument n, 
 * or a badResult if some sub-computation produced a badResult. 
 * Functions can assume that all their arguments are good values. 
 * 
 * 
 * Abstraction. We are using the Hole to indicate an abstract value. Holes can have the following attributes:
 * type: {t:("lst", "int", "fun"), rec:, len:N}
 * 
 * 
 */
let maplanguage = [
    {
        name: "map",
        kind: "fun",
        type: Tp("list[\\alpha]->(\\alpha->\\beta)->list[\\beta]"),
        nargs: 2,
        imp: function (lst, f) {
            if (!(lst instanceof Array)) {
                return rvError(0);
            }
            if (!(f instanceof Function)) {
                return rvError(1);
            }
            let rv = lst.map(f);
            for (let elem of rv) {
                if (isError(elem)) {
                    return rvError(1);
                }
                if (isBadResult(elem)) {
                    return elem;
                }
            }
            return rv;
        },
        abstract: function (lst, f) {
            if (isHole(lst)) {
                if (lst.type && lst.type.t != "lst") {
                    return rvError(0);
                }
                if (isHole(f)) {
                    if (f.type && f.type.t != "fun") {
                        return rvError(1);
                    }
                } else {
                    if (!(f instanceof Function)) {
                        return rvError(1);
                    }
                }
                return lst;
            } else {
                if (!(lst instanceof Array)) {
                    return rvError(0);
                }
            }
            if (isHole(f)) {
                if (f.type && f.type.t != "fun") {
                    return rvError(1);
                }
                return lst.map((r) => makeHole());
            } else {
                if (!(f instanceof Function)) {
                    return rvError(1);
                }
            }
            let rv = lst.map(f);
            for (let elem of rv) {
                if (isError(elem)) {
                    return rvError(1);
                }
                if (isBadResult(elem)) {
                    return elem;
                }
            }
            return rv;
        }
    }
    ,
    {
        name: "reduce",
        kind: "fun",
        type: Tp("list[\\alpha]->(\\alpha->\\beta->\\beta)->\\beta->\\beta"),
        nargs: 3,
        imp: function (lst, f, init) {
            if (!(lst instanceof Array)) {
                return rvError(0);
            }
            if (!(f instanceof Function)) {
                return rvError(1);
            }
            let acc = init;
            for (let elem of lst) {
                let skolem = f(elem);
                if (isError(skolem)) {
                    return rvError(1);
                }
                if (isBadResult(skolem)) {
                    return skolem;
                }
                if (!(skolem instanceof Function)) {
                    return rvError(1);
                }
                acc = skolem(acc);
                if (isError(acc)) {
                    return rvError(1);
                }
                if (isBadResult(acc)) {
                    return acc;
                }
            }
            return acc;
        },
        abstract: function (lst, f, init) {
            if (isHole(lst)) {
                if (lst.type && lst.type.t != "lst") {
                    return rvError(0);
                }
                if (lst.type && lst.type.t == "lst" && (f instanceof Function)) {
                    return f(makeHole(lst.type.rec), init);
                }

                if (isHole(f)) {
                    if (f.type && f.type.t != "fun") {
                        return rvError(1);
                    }
                } else {
                    if (!(f instanceof Function)) {
                        return rvError(1);
                    }
                }
                return makeHole();
            } else {
                if (!(lst instanceof Array)) {
                    return rvError(0);
                }
            }
            if (isHole(f)) {
                if (f.type && f.type.t != "fun") {
                    return rvError(1);
                }
                return makeHole();
            } else {
                if (!(f instanceof Function)) {
                    return rvError(1);
                }
            }
            let acc = init;
            for (let elem of lst) {
                let skolem = f(elem);
                if (isError(skolem)) {
                    return rvError(1);
                }
                if (isBadResult(skolem)) {
                    return skolem;
                }
                if (!(skolem instanceof Function)) {
                    return rvError(1);
                }
                acc = skolem(acc);
                if (isError(acc)) {
                    return rvError(1);
                }
                if (isBadResult(acc)) {
                    return acc;
                }
            }
            return acc;
        }
    }
    ,
    {
        name: "mad",
        kind: "fun",
        nargs: 3,
        type: Tp("int->int->int->int"),
        imp: function (c, a, b) {
            if (!(typeof (c) == 'number')) {
                return rvError(0);
            }
            if (!(typeof (a) == 'number')) {
                return rvError(1);
            }
            if (!(typeof (b) == 'number')) {
                return rvError(2);
            }
            return c * a + b;
        },
        abstract: function (c, a, b) {
            let hasHole = false;
            if (isHole(c)) {
                if (c.type) {
                    if (c.type.t != "int") {
                        return rvError(0);
                    }
                }
                hasHole = true;
            } else {
                if (!(typeof (c) == 'number')) {
                    return rvError(0);
                }
            }

            if (isHole(a)) {
                if (a.type) {
                    if (a.type.t != "int") {
                        return rvError(1);
                    }
                }
                hasHole = true;
            } else {
                if (!(typeof (a) == 'number')) {
                    return rvError(1);
                }
            }
            if (isHole(b)) {
                if (b.type) {
                    if (b.type.t != "int") {
                        return rvError(2);
                    }
                }
                hasHole = true;
            } else {
                if (!(typeof (b) == 'number')) {
                    return rvError(2);
                }
            }
            if (hasHole) {
                return makeHole({ t: "int" });
            }
            return c * a + b;
        }
    }
    ,
    {
        name: "N",
        kind: "int",
        range: [0, 5]
    }
    ,
    {
        name: "lambda1",
        kind: "lambda",
    }
]
let problems = {
    "mapincrement": {
        intypes: [{ kind: "input", name: "x", type: Tp("list[int]") }],
        io: [{ in: { x: [1, 2, 3] }, out: [2, 3, 4] },
            { in: { x: [5, 6, 9] }, out: [6, 7, 10] }],
        depth: 4
    },
    "reducebasic": {
        intypes: [{ kind: "input", name: "x", type: Tp("list[int]") }],
        io: [{ in: { x: [1, 2, 3] }, out: 6 },
        { in: { x: [5, 6, 9] }, out: 20 },
            { in: { x: [7, 0, 0] }, out: 7 }],
        depth: 4
    },
    "2dreduce": {
        intypes: [{ kind: "input", name: "x", type: Tp("list[list[int]]") }],
        io:[{ in: { x: [[1, 2], [3, 4]] }, out: [3, 7] },
        { in: { x: [[5, 6], [9, 10]] }, out: [11, 19] },
            { in: { x: [[7, 0], [1, 2, 3], [2, 3]] }, out: [7, 6, 5] }],
        depth:6
    },
    "prodreduce": {
        intypes: [{ kind: "input", name: "x", type: Tp("list[int]") }],
        io:[{ in: { x: [1, 2, 3] }, out: 6 },
            { in: { x: [5, 2, 3] }, out: 30 },
            { in: { x: [7, 0, 0] }, out: 0 }],
        depth: 4
    }
};



function runOne(p, verbose) {
    let problem = problems[p];
    console.log("Problem ", p);
    let sol = synthesize(problem.intypes, problem.io, maplanguage, score, 0.001, problem.depth, 10000);
    console.log(p, " Solution ", sol.print());;
    if (verbose) {
        for (let i = 0; i < problems[p].io.length; ++i) {
            console.log("Input: ", problems[p].io[i].in.x);
            console.log("Output:", sol.prog.eval(3, problems[p].io[i].in, []));
            console.log("Target:", problems[p].io[i].out);
        }
    }    
    return sol;
}


function r2r(verbose) {
    runOne("2dreduce", verbose);
}


function runAll(verbose) {
    let sols = {};
    for (let p in problems) {
        let rv = runOne(p, verbose);
        sols[p] = rv;
    }
    return sols;
}


function runB() {
    let examples = [{ in: { x: [1, 2, 3] }, out: [2, 3, 4] },
    { in: { x: [5, 6, 9] }, out: [6, 7, 10] }];
    let sol = synthesize([{ kind: "input", name: "x", type: Tp("list[int]") }], examples, maplanguage, score, 0.001, 3, 1000);
    console.log("Solution ", sol.print());
    for (let i = 0; i < examples.length; ++i) {
        console.log("Input: ", examples[i].in.x);
        console.log("Output:", sol.prog.eval(3, examples[i].in, []));
        console.log("Target:", examples[i].out);
    }
}


function run() {
    let examples = [{ in: { x: [1, 2, 3] }, out: 6 },
        { in: { x: [5, 6, 9] }, out: 20 },
        { in: { x: [7, 0, 0] }, out: 7 }];
    let sol = synthesize([{ kind: "input", name: "x", type:Tp("list[int]") }], examples, maplanguage, score, 0.001, 5, 5000);
    console.log("Solution ", sol.print());
    for (let i = 0; i < examples.length; ++i) {
        console.log("Input: ", examples[i].in.x);
        console.log("Output:", sol.prog.eval(3, examples[i].in, []));
        console.log("Target:", examples[i].out);
    }
}


// Export for Node.js (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { language: maplanguage, run: run, runAll: runAll, runOne };
}
// Export for browsers (ES6 Modules)
else if (typeof exports === 'undefined') {
    window.simplmaplang = { language: maplanguage, run: run, runAll: runAll, runOne, r2r };
}