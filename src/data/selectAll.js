// Reads every row of a table in pages of 1,000 (the database's per-request limit), so big tables never get cut off.
const PAGE = 1000;

// makeQuery() must return a fresh query each time, e.g. () => db.from('players').select('*').order('id').
export async function selectAll(makeQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await makeQuery().range(from, from + PAGE - 1);
    if (error) return { data: null, error };
    rows.push(...data);
    if (data.length < PAGE) return { data: rows, error: null };
  }
}
