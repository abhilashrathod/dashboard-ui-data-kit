# Screenshots

Images used by the root [README](../../README.md). Capture them from the demo app at a 1440px-wide window, comfortable density, unless noted.

| File                    | What it shows                                                                                                                           | Used in                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `overview-light.png`    | The Overview in light mode: KPI cards, revenue chart, status donut, recent orders.                                                      | Hero                             |
| `overview-dark.png`     | The same Overview in dark mode.                                                                                                         | Dark mode / server error row     |
| `orders-filters.png`    | Orders with active filter pills (Status: Paid, Amount > $1,000), sorted by Amount descending. Include the address bar so the URL shows. | Hard problem 1                   |
| `partial-failure.png`   | The Overview opened with `?fail=metrics.kpis`: the KPI cards in their error state with Retry, the chart and table still working.        | Hard problem 3                   |
| `form-server-error.png` | The New order drawer after "Use an existing reference (demo)" and submit: the server's duplicate error inline on Reference.             | Dark mode / server error row     |
| `keyboard-focus.png`    | Orders navigated by keyboard: the focus ring on a cell, the active row tinted. Optionally the keyboard help dialog (**?**) open.        | Hard problem 4                   |
| `filters-url.gif`       | Optional. A short loop: apply a filter, the URL updates, refresh, the same view comes back.                                             | Can replace `orders-filters.png` |
