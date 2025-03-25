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


function substrBody(startA, startB, endA, endB, idx, input) {
    for (let i = 0; i < idx + 1; i++) {
        let pattern = new RegExp("(" + startA.source + ")" + "(" + startB.source + ")");
        let start = input.match(pattern);
        if (start == null) {
            return "";
        }
        let startIdx = start.index + start[1].length;
        input = input.substring(startIdx);

        pattern = new RegExp("(" + endA.source + ")" + "(" + endB.source + ")");
        let end = input.match(pattern);
        if (end == null) {
            return "";
        }
        let endIdx = end.index + end[1].length;
        if (i == idx) {
            return input.substring(0, endIdx);
        } else {
            input = input.substring(endIdx);
        }
    }
    return input.substring(start, end);
}

let regexpChoices = [/\(/, /\)/, /[a-zA-Z]/, /[0-9]/, /\s/, new RegExp("")];

let strlanguage = [    
    {
        name: "reg",
        kind: "fun",
        parametric: true,
        type:Tp("RegExp"),
        paramInit: function () {
            let choices = regexpChoices;
            return choices[Math.floor(Math.random() * choices.length)];
        },
        paramMorph: function (param) {
            let choices = regexpChoices;
            return choices[Math.floor(Math.random() * choices.length)];
        },
        nargs: 0,
        imp: function (param) {
            return function () {                
                return param;
            }
        },
        abstract: function (param) {
            return function (input) {
                return param;
            }
        }
    }
    ,{
        name: "substring",
        kind: "fun",
        nargs: 6,
        type: Tp("RegExp -> RegExp -> RegExp -> RegExp -> int -> string -> string"),
        imp: function (startA, startB, endA, endB, idx, input) {
            if (typeof (input) != 'string') {
                return rvError(5);
            }
            if (!(startA instanceof RegExp)) {
                return rvError(0);
            }
            if (!(startB instanceof RegExp)) {
                return rvError(1);
            }
            if (!(endA instanceof RegExp)) {
                return rvError(2);
            }
            if (!(endB instanceof RegExp)) {
                return rvError(3);
            }
            if (typeof (idx) != 'number') {
                return rvError(4);
            }
            return substrBody(startA, startB, endA, endB, idx, input);
        },
        abstract: function (startA, startB, endA, endB, idx, input) {
            let hasHoles = false;
            if (isHole(input)) {
                hasHoles = true;
            }else if (typeof (input) != 'string') {
                return rvError(5);
            }
            if (isHole(startA)) {
                hasHoles = true;
            }else if (!(startA instanceof RegExp)) {
                return rvError(0);
            }
            if (isHole(startB)) {
                hasHoles = true;
            }else if (!(startB instanceof RegExp)) {
                return rvError(1);
            }
            if (isHole(endA)) {
                hasHoles = true;
            } else if (!(endA instanceof RegExp)) {
                return rvError(2);
            }
            if (isHole(endB)) {
                hasHoles = true;
            } else if (!(endB instanceof RegExp)) {
                return rvError(3);
            }
            if (isHole(idx)) {
                hasHoles = true;
            } else if (typeof (idx) != 'number') {
                return rvError(4);
            }
            if (hasHoles) {
                return makeHole();
            }
            return substrBody(startA, startB, endA, endB, idx, input);
        }
    },
    {
        name: "concat",
        kind: "fun",
        nargs: 2,
        type: Tp("string -> string -> string"),
        imp: function (a, b) {
            if (typeof (a) != 'string') {
                return rvError(0);
            }
            if (typeof (b) != 'string') {
                return rvError(1);
            }
            return a + b;
        },
        abstract: function (a, b) {
            let hasHoles = false;
            if (isHole(a)) {
                hasHoles = true;
            } else if (typeof (a) != 'string') {
                return rvError(0);
            }
            if (isHole(b)) {
                hasHoles = true;
            } else if (typeof (b) != 'string') {
                return rvError(1);
            }
            if (hasHoles) {
                return "  ";
            }
            return a + b;
        }
        
    },
    {
        name: "N",
        kind: "int",
        range: [0, 5]
    }

];

function stringScore(examples, outputs) {
    function singleOutput(target, output) {
        if (typeof (output) != "string") {
            return 1;
        }
        let minL = Math.min(target.length, output.length);
        let maxL = Math.max(target.length, output.length);
        let error = 0;
        for (let i = 0; i < minL; ++i) {
            if (target[i] != output[i]) {
                error += 1;
            }
        }
        error += maxL - minL;
        return 0.7*error / maxL;
    }
    let output = 0;
    for (let idx in outputs) {
        output += singleOutput(examples[idx].out, outputs[idx]);
    }
    return output / outputs.length;
}


function run() {
    let examples = [{ in: { x: "(hello) world" }, out: "hello" },
    { in: { x: "this is (the) word" }, out: "the" },
    { in: { x: "a (good) example" }, out: "good" }];
    let sol = synthesize([{ kind: "input", name: "x" }], examples, strlanguage, stringScore, 0.001, 3, 300);
    console.log("Solution ", sol.print());
    for (let i = 0; i < examples.length; ++i) {
        console.log("Input: ", examples[i].in.x);
        console.log("Output:", sol.prog.eval(3, examples[i].in, []));
        console.log("Target:", examples[i].out);
    }
}




// Export for Node.js (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { language: strlanguage, run: run, runAll: runAll, runOne };
}
// Export for browsers (ES6 Modules)
else if (typeof exports === 'undefined') {
    window.stringlang = { language: strlanguage, run: run };
}