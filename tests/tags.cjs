const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{const t=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('tags.js')).toString('base64'));
assert.deepEqual(t.normalizeTags(null),[]);
assert.deepEqual(t.normalizeTags([' 뷰티 ','개인 프로젝트','뷰티','실무 프로젝트']),['개인 프로젝트','뷰티']);
assert.deepEqual(t.editTags(['개인 프로젝트','뷰티','반응형'],{type:'실무 프로젝트',add:['의료','뷰티'],remove:['반응형']}),['실무 프로젝트','뷰티','의료']);
assert.deepEqual(t.editTags([],{add:['개인 프로젝트','SNS']}),['SNS']);
assert.throws(()=>t.editTags([],{type:'invalid'}));console.log('tag invariants: passed');})();
