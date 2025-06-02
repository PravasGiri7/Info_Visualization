class Histogram {
  margin = { top: 10, right: 10, bottom: 40, left: 40 };

  constructor(svgSelector, width = 400, height = 550) {
    this.svg = d3.select(svgSelector);
    this.width = width - this.margin.left - this.margin.right;
    this.height = height - this.margin.top - this.margin.bottom;
  }

  initialize() {
    this.container = this.svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    this.xAxisGroup = this.svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top + this.height})`);

    this.yAxisGroup = this.svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    this.xScale = d3.scaleBand().padding(0.3);
    this.yScale = d3.scaleLinear();

    this.svg
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom);
  }

  update(data, xVar) {
    if (data.length === 0) {
      this.container.selectAll("rect").remove();
      this.xAxisGroup.call(d3.axisBottom(this.xScale).scale([]));
      this.yAxisGroup.call(d3.axisLeft(this.yScale).scale([]));
      return;
    }

    const counts = d3.rollups(
      data,
      v => v.length,
      d => d[xVar]
    );

    counts.sort((a, b) => d3.descending(a[1], b[1]));

    const categories = counts.map(d => d[0]);
    const values = counts.map(d => d[1]);

    this.xScale.domain(categories).range([0, this.width]);
    this.yScale.domain([0, d3.max(values)]).range([this.height, 0]).nice();

    const bars = this.container.selectAll("rect").data(counts, d => d[0]);

    bars.join(
      enter => enter.append("rect")
        .attr("x", d => this.xScale(d[0]))
        .attr("y", this.height)
        .attr("width", this.xScale.bandwidth())
        .attr("height", 0)
        .attr("fill", "lightgray")
        .call(enter => enter.transition()
          .duration(600)
          .attr("y", d => this.yScale(d[1]))
          .attr("height", d => this.height - this.yScale(d[1]))
        ),
      update => update.call(update => update.transition()
        .duration(600)
        .attr("x", d => this.xScale(d[0]))
        .attr("width", this.xScale.bandwidth())
        .attr("y", d => this.yScale(d[1]))
        .attr("height", d => this.height - this.yScale(d[1]))
      ),
      exit => exit.call(exit => exit.transition()
        .duration(300)
        .attr("height", 0)
        .attr("y", this.height)
        .remove()
      )
    );

    this.xAxisGroup.transition().duration(600).call(d3.axisBottom(this.xScale));
    this.yAxisGroup.transition().duration(600).call(d3.axisLeft(this.yScale).ticks(6));
  }
}
