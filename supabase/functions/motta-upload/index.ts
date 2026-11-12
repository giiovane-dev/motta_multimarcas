import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {handleUpload} from './handler.js';
Deno.serve(req=>handleUpload(req,{createClient,env:name=>Deno.env.get(name)}));
