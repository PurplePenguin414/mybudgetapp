// Budget Dashboard — Average Budget Widget (iOS Home Screen)
// Requires the free "Scriptable" app from the App Store.
//
// SETUP:
// 1. Open Scriptable, tap + to create a new script, paste this whole file in.
// 2. Replace WIDGET_URL and WIDGET_KEY below with your real values.
//    (WIDGET_KEY is the same WIDGET_API_KEY used by the main Budget widget.)
// 3. Tap the wrench icon (bottom right) > run once to test.
// 4. Long-press your iPhone home screen > tap + (top left) > search "Scriptable"
//    > choose the medium widget size > add it.
// 5. Long-press the new widget > Edit Widget > set "Script" to this script's name.
//
// Shows your average monthly income/expenses/net, and your top spending
// categories by average monthly cost (the current in-progress month is
// excluded so it doesn't skew the numbers, same as the Averages page).

const WIDGET_URL = "https://budget.megangibbs.net/api/widget/averages";
const WIDGET_KEY = "PASTE_YOUR_WIDGET_API_KEY_HERE";

// Same palette as the pie chart on the Averages page, so the colored dots
// here line up with what you'd see on the web app.
const PIE_COLORS = [
  "#2761a0", "#c94235", "#2a8a5f", "#b87318", "#7a5ea8", "#c9598a"
];

async function getData() {
  const req = new Request(`${WIDGET_URL}?key=${WIDGET_KEY}`);
  req.timeoutInterval = 10;
  try {
    return await req.loadJSON();
  } catch (e) {
    return { error: true };
  }
}

function fmt(n) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

async function createWidget(data) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#000000");
  w.url = WIDGET_URL.replace("/api/widget/averages", "/averages.html");
  w.setPadding(14, 14, 14, 14);

  if (data.error) {
    const t = w.addText("Couldn't load Avg Budget");
    t.font = Font.mediumSystemFont(13);
    t.textColor = new Color("#b8483c");
    return w;
  }

  const title = w.addText("📊 Avg Budget");
  title.font = Font.boldSystemFont(15);
  title.textColor = new Color("#ffffff");
  w.addSpacer(4);

  if (data.monthCount === 0) {
    w.addSpacer(6);
    const none = w.addText("No data logged yet");
    none.font = Font.systemFont(12);
    none.textColor = new Color("#c7c7c7");
    return w;
  }

  const subtitle = w.addText(`across ${data.monthCount} month${data.monthCount === 1 ? "" : "s"}`);
  subtitle.font = Font.systemFont(10);
  subtitle.textColor = new Color("#8a8a8a");
  w.addSpacer(6);

  // NOTE: the server nests these under "totals", not top-level.
  const netRow = w.addStack();
  netRow.layoutHorizontally();
  netRow.centerAlignContent();
  const netLabel = netRow.addText(`Net: ${fmt(data.totals.avgNet)}/mo`);
  netLabel.font = Font.mediumSystemFont(12);
  netLabel.textColor = data.totals.avgNet >= 0 ? new Color("#3f8f5f") : new Color("#b8483c");
  netRow.addSpacer(6);
  const inOut = netRow.addText(`${fmt(data.totals.avgIncome)} in · ${fmt(data.totals.avgExpense)} out`);
  inOut.font = Font.systemFont(10);
  inOut.textColor = new Color("#c7c7c7");
  w.addSpacer(8);

  // NOTE: the server returns an "expense" array (each with category/avg/bucket),
  // not a "topCategories" field — build the top-5 list from it here, sorted
  // by average monthly cost descending (the server already sorts this way,
  // but we re-slice defensively in case that changes).
  const topCategories = [...data.expense]
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)
    .map((e) => ({ name: e.category, avg: e.avg }));

  if (topCategories.length === 0) {
    const none = w.addText("No expenses logged yet");
    none.font = Font.systemFont(12);
    none.textColor = new Color("#c7c7c7");
  } else {
    for (let i = 0; i < topCategories.length; i++) {
      const cat = topCategories[i];
      const row = w.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();

      const dot = row.addText("●");
      dot.font = Font.systemFont(10);
      dot.textColor = new Color(PIE_COLORS[i % PIE_COLORS.length]);
      row.addSpacer(5);

      const name = row.addText(cat.name);
      name.font = Font.mediumSystemFont(12);
      name.textColor = new Color("#ffffff");
      name.lineLimit = 1;

      row.addSpacer();

      const amt = row.addText(fmt(cat.avg));
      amt.font = Font.systemFont(11);
      amt.textColor = new Color("#c7c7c7");
      amt.rightAlignText();

      w.addSpacer(3);
    }
  }

  return w;
}

const data = await getData();
const widget = await createWidget(data);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
