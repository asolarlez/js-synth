// This file imports synlib.js and then invokes the run method.

// Import the synlib module
import { runAll as runAllSimpl } from './simplmaplang.js';
import { runAll as runAllString } from './stringlang.js';
import { runAll as runAllCsg } from './csglang.js';

function runExperiments() {
    let aggregated = {};
    function addToAggregated(result) {
        for (let name in result) {
            if (aggregated[name] === undefined) {
                aggregated[name] = [];
            }
            aggregated[name].push(result[name]);
        }        
    }
    for (let i = 0; i < 30; i++) {
        let simpRes = runAllSimpl();
        let strlRes = runAllString();
        let csgRes = runAllCsg();
        addToAggregated(simpRes);
        addToAggregated(strlRes);
        addToAggregated(csgRes);
    }
    function printAggregateStats(aggregated) {
        for (let name in aggregated) {
            let values = aggregated[name];            
            let cost = values.reduce((a, b) => b.cost + a, 0);            
            let corrects = values.reduce((a, b) => (b.status == "CORRECT" ? 1 : 0) + a, 0);
            let avgCost = cost / values.length;
            let fracCorrect = corrects / values.length;
            console.log(`${name}: avgCost = ${avgCost}, fracCorrect = ${fracCorrect}`);
        }

        console.log("experiment = {");
        for (let name in aggregated) {
            let values = aggregated[name];   
            let sorted = values.map((a) => a.cost).sort((a, b) => a - b);
            console.log(`  "${name}": [${sorted}],`);
        }
        console.log("};")
    }
    printAggregateStats(aggregated);
}

runExperiments();