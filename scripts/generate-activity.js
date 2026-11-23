
const fs = require("fs");
const path = require("path");

const USERNAME = "Shihab2001";
const TOKEN = process.env.GITHUB_TOKEN;

async function generateActivity() {
  if (!TOKEN) throw new Error("GITHUB_TOKEN is missing");

  // Calculate the last 30 days, including today.
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  start.setUTCHours(0, 0, 0, 0);

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
                contributionLevel
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: {
        username: USERNAME,
        from: start.toISOString(),
        to: new Date(end.getTime() + 1).toISOString(),
      },
    }),
  });

  const result = await response.json();

  if (!response.ok || result.errors) {
    throw new Error(JSON.stringify(result.errors || result));
  }

  const days =
    result.data.user.contributionsCollection.contributionCalendar.weeks
      .flatMap((week) => week.contributionDays);

  const dayMap = new Map(days.map((day) => [day.date, day]));

  const colors = {
    NONE: "#161b22",
    FIRST: "#0e4429",
    SECOND: "#006d32",
    THIRD: "#26a641",
    FOURTH: "#39d353",
  };

  const squares = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);

    const dateString = date.toISOString().slice(0, 10);
    const day = dayMap.get(dateString);

    const count = day?.contributionCount ?? 0;
    const level = day?.contributionLevel ?? "NONE";
    const color = colors[level] || colors.NONE;

    const x = (i % 10) * 66;
    const y = Math.floor(i / 10) * 40;

    const formattedDate = new Date(
      `${dateString}T12:00:00Z`
    ).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

    squares.push(`
      <rect
        x="${x}"
        y="${y}"
        width="54"
        height="28"
        rx="5"
        fill="${color}"
        stroke="#30363d"
        stroke-width="1"
      >
        <title>${formattedDate}: ${count} contributions</title>
      </rect>
    `);
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="660"
         height="120"
         viewBox="0 0 660 120"
         role="img"
         aria-label="GitHub contributions for the last 30 days">
      <title>${USERNAME} - Last 30 Days of GitHub Activity</title>
      ${squares.join("\n")}
    </svg>
  `;

  const outputDir = path.join(process.cwd(), "dist");
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, "last-30-days.svg"),
    svg
  );

  console.log("Last 30 days activity SVG generated successfully.");
}

generateActivity().catch((error) => {
  console.error(error);
  process.exit(1);
});
