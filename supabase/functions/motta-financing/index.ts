import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {createFinancingHandler} from './handler.js';
Deno.serve(createFinancingHandler({createClient,env:name=>Deno.env.get(name)}));
