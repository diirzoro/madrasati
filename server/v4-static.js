const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

const v4Root = path.join(__dirname, "..", "design-prototype-v4");

app.use(express.static(v4Root));

app.get("*", (req, res) => {
  res.sendFile(path.join(v4Root, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Madarasati V4 frontend running at http://localhost:${PORT}`);
  console.log(`Serving: ${v4Root}`);
});
