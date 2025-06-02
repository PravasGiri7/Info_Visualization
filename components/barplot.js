class RugPullBarGraph {
  margin = { top: 30, right: 40, bottom: 120, left: 80 };

  constructor(svgSelector, tooltipSelector, data, width = 900, height = 550) {
    this.svg = d3.select(svgSelector);
    this.tooltip = d3.select(tooltipSelector);
    this.data = data;
    this.width = width - this.margin.left - this.margin.right;
    this.height = height - this.margin.top - this.margin.bottom;
    this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    this.handlers = {};
  }

  initialize() {
    this.svg
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom);

    this.container = this.svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    this.xAxisGroup = this.container.append("g")
      .attr("transform", `translate(0, ${this.height})`);

    this.yAxisGroup = this.container.append("g");

    this.xLabel = this.svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", this.margin.left + this.width / 2)
      .attr("y", this.height + this.margin.top + 60)
      .attr("font-weight", "bold");

    this.yLabel = this.svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(20, ${this.margin.top + this.height / 2}) rotate(-90)`)
      .attr("font-weight", "bold");

    
    this.brush = d3.brushX()
      .extent([[0, 0], [this.width, this.height]])
      .on("brush end", event => this.brushBars(event));

    this.container.append("g")
      .attr("class", "brush")
      .call(this.brush);
  }

 brushBars(event) {
  if (!event.selection) {
    this.container.selectAll(".bar").classed("brushed", false);
    if (this.handlers.brush) this.handlers.brush([]);
    return;
  }

  const [x0, x1] = event.selection;

  const selectedBars = [];
  this.container.selectAll(".bar")
    .classed("brushed", d => {
      const x = this.xScale(d.displayKey);  
      const barWidth = this.xScale.bandwidth();
      const isBrushed = (x + barWidth >= x0 && x <= x1);
      if (isBrushed) selectedBars.push(...d.rawData);
      return isBrushed;
    });

  if (this.handlers.brush) this.handlers.brush(selectedBars);
}

  update(xKey, yKey) {
  let data = this.data;

  if (xKey === "Rug-Pull Year") {
    data = data.filter(d => d["Rug-Pull Year"] !== null);
  }

  
  let groupedMap = d3.group(
    data,
    d => d[xKey] ? d[xKey].toString().trim().toLowerCase() : ""
  );

  let grouped = Array.from(groupedMap.entries()).map(([normKey, group]) => {
    const totalLost = d3.sum(group, d => d["Total Amount Lost"]);
    const count = group.length;
    return {
      normKey,
      displayKey: group[0][xKey].toString().trim(),
      totalLost,
      count,
      avgLost: totalLost / count,
      rawData: group
    };
  });

  if (xKey === "Rug-Pull Year") {
    grouped.sort((a, b) => a.displayKey - b.displayKey);
  } else {
    grouped.sort((a, b) => d3.ascending(a.displayKey, b.displayKey));
  }

  this.xScale = d3.scaleBand()
    .domain(grouped.map(d => d.displayKey))
    .range([0, this.width])
    .padding(0.2);

  let yMax;
  if (yKey === "Total Amount Lost") {
    yMax = d3.max(grouped, d => d.totalLost);
  } else if (yKey === "Count of Projects") {
    yMax = d3.max(grouped, d => d.count);
  } else {
    yMax = d3.max(grouped, d => d.avgLost);
  }

  const yScale = d3.scaleLinear()
    .domain([0, yMax * 1.05])
    .range([this.height, 0])
    .nice();

  const bars = this.container.selectAll(".bar")
    .data(grouped, d => d.displayKey);

  bars.join(
    enter => enter.append("rect")
      .attr("class", "bar")
      .attr("x", d => this.xScale(d.displayKey))
      .attr("width", this.xScale.bandwidth())
      .attr("y", this.height)
      .attr("height", 0)
      .attr("fill", (d, i) => this.colorScale(i))
      .on("mousemove", (event, d) => {
        let val;
        if (yKey === "Total Amount Lost") val = d.totalLost.toLocaleString();
        else if (yKey === "Count of Projects") val = d.count;
        else val = d.avgLost.toFixed(0);

        this.tooltip.style("display", "block")
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px")
          .html(`<strong>${xKey}:</strong> ${d.displayKey}<br><strong>${yKey}:</strong> ${val}`);
      })
      .on("mouseout", () => {
        this.tooltip.style("display", "none");
      })
      .call(enter => enter.transition()
        .duration(600)
        .attr("y", d => {
          if (yKey === "Total Amount Lost") return yScale(d.totalLost);
          if (yKey === "Count of Projects") return yScale(d.count);
          return yScale(d.avgLost);
        })
        .attr("height", d => this.height - (
          yKey === "Total Amount Lost" ? yScale(d.totalLost) :
          yKey === "Count of Projects" ? yScale(d.count) : yScale(d.avgLost)
        ))
      ),
    update => update.call(update => update.transition()
      .duration(600)
      .attr("x", d => this.xScale(d.displayKey))
      .attr("width", this.xScale.bandwidth())
      .attr("y", d => {
        if (yKey === "Total Amount Lost") return yScale(d.totalLost);
        if (yKey === "Count of Projects") return yScale(d.count);
        return yScale(d.avgLost);
      })
      .attr("height", d => this.height - (
        yKey === "Total Amount Lost" ? yScale(d.totalLost) :
        yKey === "Count of Projects" ? yScale(d.count) : yScale(d.avgLost)
      ))
      .attr("fill", (d, i) => this.colorScale(i))
    ),
    exit => exit.call(exit => exit.transition()
      .duration(300)
      .attr("height", 0)
      .attr("y", this.height)
      .remove()
    )
  );

  this.xAxisGroup.transition()
    .duration(600)
    .call(d3.axisBottom(this.xScale))
    .selectAll("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-25)")
    .attr("dx", "-0.6em")
    .attr("dy", "0.1em");

  const yAxisTicks = d3.axisLeft(yScale).ticks(8);
  if (yKey === "Total Amount Lost") {
    yAxisTicks.tickFormat(d => {
      if (d >= 1e9) return (d / 1e9) + "B";
      if (d >= 1e6) return (d / 1e6) + "M";
      if (d >= 1e3) return (d / 1e3) + "K";
      return d;
    });
  }

  this.yAxisGroup.transition()
    .duration(600)
    .call(yAxisTicks);

  this.xLabel.text(xKey);
  this.yLabel.text(yKey);
}


  onBrush(callback) {
    this.handlers.brush = callback;
  }
}