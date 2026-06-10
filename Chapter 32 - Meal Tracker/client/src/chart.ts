import type { DailyCalories } from "../../shared/types.ts";

// A dependency-free line chart rendered as inline SVG. Given the daily summary,
// it returns an <svg> element the caller drops into the page.

const SVG = "http://www.w3.org/2000/svg";

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

export function calorieChart(data: DailyCalories[]): SVGSVGElement {
  const width = 680;
  const height = 280;
  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    class: "chart",
    role: "img",
    "aria-label": "Total calories per day",
  });

  const maxCal = Math.max(100, ...data.map((d) => d.calories));
  // Place each day evenly across the x-axis; a single point sits centered.
  const x = (i: number) =>
    pad.left + (data.length <= 1 ? plotW / 2 : (plotW * i) / (data.length - 1));
  const y = (cal: number) => pad.top + plotH - (plotH * cal) / maxCal;

  // Horizontal gridlines + y labels at 0, 50%, 100% of max.
  for (const frac of [0, 0.5, 1]) {
    const gy = pad.top + plotH - plotH * frac;
    svg.append(
      svgEl("line", {
        x1: pad.left,
        y1: gy,
        x2: width - pad.right,
        y2: gy,
        stroke: "#2a3441",
      }),
    );
    const label = svgEl("text", {
      x: pad.left - 8,
      y: gy + 4,
      fill: "#8b98a5",
      "font-size": 11,
      "text-anchor": "end",
    });
    label.textContent = String(Math.round(maxCal * frac));
    svg.append(label);
  }

  // The line connecting daily totals.
  if (data.length > 1) {
    const points = data.map((d, i) => `${x(i)},${y(d.calories)}`).join(" ");
    svg.append(
      svgEl("polyline", {
        points,
        fill: "none",
        stroke: "#4fc3f7",
        "stroke-width": 2,
      }),
    );
  }

  // Points + x-axis date labels.
  data.forEach((d, i) => {
    svg.append(
      svgEl("circle", { cx: x(i), cy: y(d.calories), r: 4, fill: "#66bb6a" }),
    );
    const label = svgEl("text", {
      x: x(i),
      y: height - pad.bottom + 18,
      fill: "#8b98a5",
      "font-size": 11,
      "text-anchor": "middle",
    });
    label.textContent = d.date.slice(5); // MM-DD
    svg.append(label);
  });

  return svg;
}
