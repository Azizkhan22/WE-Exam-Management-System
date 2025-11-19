const API = (path) => '/api/' + path;
async function req(path, opts){
  const res = await fetch(API(path), opts);
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}
export async function list(resource){ return req(resource); }
export async function create(resource, body){ return req(resource, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); }
export async function update(resource, id, body){ return req(resource + '/' + id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); }
export async function remove(resource, id){ return req(resource + '/' + id, { method:'DELETE' }); }
export async function allocate(plan_id, data){ return req('seating_plans/' + plan_id + '/allocate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) }); }
export async function swap(plan_id, data){ return req('seating_plans/' + plan_id + '/swap', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) }); }
export async function getAllocated(plan_id, room_id){ return req('allocated_seats?plan_id=' + plan_id + '&room_id=' + room_id); }

