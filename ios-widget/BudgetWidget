// Budget Dashboard — iOS Home Screen Widget
// Requires the free "Scriptable" app from the App Store.
//
// SETUP:
// 1. Open Scriptable, tap + to create a new script, paste this whole file in.
// 2. Replace WIDGET_URL and WIDGET_KEY below with your real values.
//    (WIDGET_KEY is the WIDGET_API_KEY you set in the dashboard's .env file.)
// 3. Tap the wrench icon (bottom right) > run once to test.
// 4. Long-press your iPhone home screen > tap + (top left) > search "Scriptable"
//    > choose the medium or small widget size > add it.
// 5. Long-press the new widget > Edit Widget > set "Script" to this script's name.
//
// The widget refreshes periodically on iOS's own schedule (usually every
// 15-60 min); tap the widget to jump straight into the app.

const WIDGET_URL = "https://budget.megangibbs.net/api/widget/summary";
const WIDGET_KEY = "PASTE_YOUR_WIDGET_API_KEY_HERE";

async function getData() {
  const req = new Request(`${WIDGET_URL}?key=${WIDGET_KEY}`);
  req.timeoutInterval = 10;
  try {
    return await req.loadJSON();
  } catch (e) {
    return { error: true };
  }
}

function colorFor(status) {
  if (status === "over") return new Color("#b8483c");
  if (status === "near") return new Color("#b8862c");
  return new Color("#3f8f5f");
}

function pctLabelFor(cat) {
  return `${cat.pct}%`;
}

function fmt(n) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

async function createWidget(data) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#000000");
  w.url = data.app_url || WIDGET_URL.replace("/api/widget/summary", "/index.html");
  w.setPadding(14, 14, 14, 14);

  if (data.error) {
    const t = w.addText("Couldn't load Budget Dashboard");
    t.font = Font.mediumSystemFont(13);
    t.textColor = new Color("#b8483c");
    return w;
  }

  const title = w.addText("💰 Budget");
  title.font = Font.boldSystemFont(15);
  title.textColor = new Color("#ffffff");
  w.addSpacer(6);

  const inOut = w.addText(`${fmt(data.income)} in · ${fmt(data.expense)} out`);
  inOut.font = Font.systemFont(11);
  inOut.textColor = new Color("#c7c7c7");
  w.addSpacer(3);

  const netRow = w.addStack();
  netRow.layoutHorizontally();
  netRow.centerAlignContent();
  const netLabel = netRow.addText(`Net: ${fmt(data.net)}`);
  netLabel.font = Font.mediumSystemFont(12);
  netLabel.textColor = data.net >= 0 ? new Color("#3f8f5f") : new Color("#b8483c");
  netRow.addSpacer(6);
  const rateLabel = netRow.addText(`${data.savingsRate}% saved`);
  rateLabel.font = Font.systemFont(11);
  rateLabel.textColor = new Color("#c7c7c7");

  w.addSpacer(8);

  const totalFlags = data.counts.over_target + data.counts.near_target;

  if (totalFlags === 0) {
    const ok = w.addText("✅ All categories on track");
    ok.font = Font.systemFont(12);
    ok.textColor = new Color("#3f8f5f");
  } else {
    const summary = w.addText(
      `${data.counts.over_target} over budget · ${data.counts.near_target} near limit`
    );
    summary.font = Font.systemFont(11);
    summary.textColor = new Color("#c7c7c7");
    w.addSpacer(6);

    const shown = data.needs_attention.slice(0, 4);
    for (const cat of shown) {
      const row = w.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();

      const dot = row.addText("●");
      dot.font = Font.systemFont(10);
      dot.textColor = colorFor(cat.status);
      row.addSpacer(5);

      const name = row.addText(cat.name);
      name.font = Font.mediumSystemFont(12);
      name.textColor = new Color("#ffffff");
      name.lineLimit = 1;

      row.addSpacer();

      const pct = row.addText(pctLabelFor(cat));
      pct.font = Font.systemFont(10);
      pct.textColor = colorFor(cat.status);
      pct.rightAlignText();

      w.addSpacer(3);
    }

    if (data.needs_attention.length > shown.length) {
      w.addSpacer(2);
      const more = w.addText(`+${data.needs_attention.length - shown.length} more`);
      more.font = Font.systemFont(10);
      more.textColor = new Color("#c7c7c7");
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
