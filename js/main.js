const cyclesContainerId = "#cycles-container";

let cyclesDiv = null;
$(document).ready(function () {
  cyclesDiv = $(cyclesContainerId)[0];
  console.log(cyclesDiv);
});

function clearCycles() {
  //cyclesDiv.innerHtml = "";
}

function drawCycle(activities, title, cycleIndex) {
  var links = [];
  const width = "100%";
  const height = "600";

  const svgContainerId = `drawing-svg-${cycleIndex}`;

  const svgContainer = document.createElement("div");
  svgContainer.id = svgContainerId; //Add a class here?
  svgContainer.className = "cycle-container";
  cyclesDiv.appendChild(svgContainer);

  const svg = d3.select(`#${svgContainerId}`).append("svg").attr("width", width).attr("height", height);

  const svgRef = svg._groups[0][0];

  // convert activities to links
  activities.forEach(function (act) {
    if (act.next) {
      act.next.forEach(function (n) {
        links.push({ source: act.activity_id, target: n, name: act.name });
      });
    }
  });

  function getStepType(act) {
    return act.activity_type ?? "step";
  }

  var nodes = [];
  // Compute the distinct nodes from the links.
  links.forEach(function (link) {
    if (!nodes.find(({ id }) => id === link.source))
      nodes.push({ id: link.source, name: link.source, label: link.name });
    if (!nodes.find(({ id }) => id === link.target)) {
      var targetAct = activities.find(({ activity_id }) => activity_id === link.target);
      nodes.push({ id: link.target, name: link.target, label: targetAct.name });
    }
  });

  function _isEntryActivity(activities, activity_id) {
    return !activities.find(({ next }) => next && next.includes(activity_id));
  }
  function _isExitActivity(activity_next) {
    return !activity_next || activity_next.length == 0;
  }

  nodes.forEach(function (n) {
    var activity = activities.find(({ activity_id }) => activity_id === n.id);
    n.type = getStepType(activity);
    n.is_exit = _isExitActivity(activity.next);
    n.is_entry = _isEntryActivity(activities, n.id);
  });


  function _drawCycle(graph) {
    var simulation = d3
      .forceSimulation()
      .force(
        "link",
        d3.forceLink().id(function (d) {
          return d.id;
        })
      )
      .force("charge", d3.forceManyBody().strength(-1900).theta(0.5).distanceMax(1500))
      .force(
        "collision",
        d3.forceCollide().radius(function (d) {
          return d.radius;
        })
      )
      .force(
        "center",
        d3.forceCenter(
          svgRef.clientWidth / 2, 
          svgRef.clientHeight / 2
        )
      );

    var defs = svg.append("defs");

    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 13)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 13)
      .attr("markerHeight", 13)
      .attr("xoverflow", "visible")
      .append("path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "#999")
      .style("stroke", "none");

    var link = svg
      .append("g")
      .selectAll("line")
      .data(graph.links)
      .enter()
      .append("polyline")
      .attr("marker-end", "url(#arrowhead)");

    link.style("stroke", "#aaa");

    var node = svg
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(graph.nodes)
      .enter()
      .append("circle")
      .attr("r", 36);
    //.attr("r", function(d){return d.category==0 ? 45 : 35}); //todo: different colours for diff types

    node.attr("class", function (d) {
      return (cls = "nodeCircle " + d.type + (d.is_exit ? " _step_exit" : "") + (d.is_entry ? " _step_entry" : ""));
    });

    node.on("mouseover", _mouseover).on("mouseout", _mouseout).call(
      d3.drag().on("start", _dragstarted).on("drag", _dragged)
      //.on("end", dragended)
    );

    var label = svg
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(graph.nodes)
      .enter()
      .append("text")
      .text(function (d) {
        return d.label;
      })
      .attr("class", "label")
      .attr("dy", ".35em")
      .attr("text-anchor", "middle");

    simulation.nodes(graph.nodes).on("tick", _ticked);
    simulation.force("link").links(graph.links);

    function _getTargetNodeCircumferencePoint(d) {
      var t_radius = 36;
      var dx = d.target.x - d.source.x;
      var dy = d.target.y - d.source.y;
      var gamma = Math.atan2(dy, dx); // Math.atan2 returns the angle in the correct quadrant as opposed to Math.atan
      var tx = d.target.x - Math.cos(gamma) * t_radius;
      var ty = d.target.y - Math.sin(gamma) * t_radius;

      return [tx, ty];
    }
    function _getSourceNodeCircumferencePoint(d) {
      var t_radius = 36;
      var dx = d.source.x - d.target.x;
      var dy = d.source.y - d.target.y;
      var gamma = Math.atan2(dy, dx); // Math.atan2 returns the angle in the correct quadrant as opposed to Math.atan
      var tx = d.source.x - Math.cos(gamma) * t_radius;
      var ty = d.source.y - Math.sin(gamma) * t_radius;

      return [tx, ty];
    }

    function _mouseover() {
      d3.select(this).select("circle").transition().duration(750).attr("r", 16);
    }

    function _mouseout() {
      d3.select(this).select("circle").transition().duration(750).attr("r", 8);
    }

    function _dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function _dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function _ticked() {
      link.attr("points", function (d) {
        var r = 36;
        sX = _getSourceNodeCircumferencePoint(d)[0];
        sY = _getSourceNodeCircumferencePoint(d)[1];
        tX = _getTargetNodeCircumferencePoint(d)[0];
        tY = _getTargetNodeCircumferencePoint(d)[1];
        return sX + "," + sY + " " + (sX + tX) / 2 + "," + (sY + tY) / 2 + " " + tX + "," + tY;
      });

      node
        .attr("cx", function (d) {
          return d.x + 5;
        })
        .attr("cy", function (d) {
          return d.y - 3;
        });

      label
        .attr("x", function (d) {
          return d.x + 4;
        })
        .attr("y", function (d) {
          return d.y - 4;
        });
    }
  }

  function _drawKey(activityTypes, activities) {
    var x = 25;
    var y = 0;
    var dy = 45;
    var nodes = [];
    var entryNode = null;
    var exitNode = null;
    activityTypes.forEach(function (a) {
      if (activities.find(({ activity_type }) => (activity_type = a.Code))) {
        nodes.push({ code: a.Code, title: a.Title });
      }
      if (!entryNode && activities.find(({ activity_id }) => _isEntryActivity(activities, activity_id))) {
        entryNode = { code: "step _step_entry", title: "Cycle Entry" };
      }
      if (!exitNode && activities.find(({ next }) => _isExitActivity(next))) {
        exitNode = { code: "step _step_exit", title: "Cycle Exit" };
      }
    });
    if (entryNode) nodes.push(entryNode);
    if (exitNode) nodes.push(exitNode);

    var key = svg
      .selectAll(".key")
      .data(nodes, function (d) {
        return d.code;
      })
      .enter()
      .append("g");

    circles = key
      .append("circle")
      .attr("r", 20)
      .attr("cx", x)
      .attr("cy", function (d) {
        y = y + dy;
        d.y = y;
        return y;
      })
      .attr("class", function (d) {
        return "nodeCircle " + d.code;
      });

    texts = key
      .append("text")
      .attr("y", function (d) {
        return d.y;
      })
      .attr("dx", "50")
      .attr("text-anchor", "start")
      .attr("alignment-baseline", "middle")
      .attr("class", "label")
      .text((d) => d.title);
  }

  function _drawTitle(title) {
    svg
      .append("text")
      .attr("y", 30)
      .attr("x", svgRef.clientWidth / 2)
      .attr("text-anchor", "start")
      .attr("alignment-baseline", "middle")
      .attr("class", "cycle_title")
      .text((d) => title);
  }

  $(cyclesContainerId).show();

  _drawTitle(title);

  d3.csv("https://reuse-standard.org/standard/codelists/activity_types.csv", function (data) {
    _drawKey(data, activities);
  });

  _drawCycle({ nodes: nodes, links: links });
}

const SCHEMA_TYPE = "https://reuse-standard.org/schema/reuse.schema.json#";

async function renderCycle(initialUrl) {
  async function _fetchData(url) {
    try {
      const { data } = await axios.get(url);

      return data;
    } catch (err) {
      console.error(err);
      renderError("An unknown error has occurred while fetching the cycle data");
    }
  }

  const data = await _fetchData(initialUrl);

  console.log(data);

  if (data.$schema != SCHEMA_TYPE) {
    renderError("Invalid data schema");
    return;
  }

  if (!data.cycles || data.cycles.length < 1) {
    renderError("There are no cycles to render");
    return;
  }

  clearCycles();

  for (let i = 0; i < data.cycles.length; i++) {
    const element = data.cycles[i];
    drawCycle(element.activities, element?.name || "Sample Cycle", i);
  }
}

function renderError(errMsg) {
  //TODO: Jquery an error message
  console.error(errMsg);
}

function handleDataSourceSubmit() {
  var value = $("#data-source-input").val();

  console.log(value);

  renderCycle(value).catch((e) => {
    renderError(e);
  });
}

//examples/multiple-cycles.json
//https://raw.githubusercontent.com/reath-id/reuse-standard/main/v0.1-alpha/examples/reuse-cycle-only-exit-entry_activities.json
