import express from 'express';
import { synthesize, deserializeState, deserializeType } from './synlib.js';


function setupServer(language, scoring, port){        
    const app = express();
    app.use(express.json());

    // POST /synthesize expects a JSON body with the necessary arguments for synthesize
    app.post('/synthesize', async (req, res) => {
        try {
            // You may want to validate/adjust these fields as needed
            let { inputspec, examples, threshold, bound, N, config } = req.body;
            inputspec = inputspec.map(x => ({...x, type: deserializeType(x.type)}));
            if (!examples ) {
                return res.status(400).json({ error: 'Missing required fields: examples, language' });
            }
            if(config.initialState){
                config.initialState = deserializeState(config.initialState, language);
            }
            // scoreOutputs may be undefined; synthesize will use default if so
            const result = synthesize(inputspec, examples, language, scoring, threshold, bound, N, config);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.toString() });
        }
    });

    app.listen(port, () => {
        console.log(`Express server listening on port ${port}`);
    }); 
}

export { setupServer };