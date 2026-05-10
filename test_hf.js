const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('https://datasets-server.huggingface.co/rows?dataset=McAuley-Lab%2FAmazon-Reviews-2023&config=raw_meta_All_Beauty&split=full&offset=0&length=10');
    const rows = res.data.rows;
    console.log(rows[0].row);
  } catch (err) {
    console.log("Error:", err.message);
  }
}
test();
