
//slider galleria img

let currentSlide = 0;

function showSlide(index) {
  const slides = document.querySelectorAll('.slide');
  if (index >= slides.length) {
    currentSlide = 0;
  } else if (index < 0) {
    currentSlide = slides.length - 1;
  } else {
    currentSlide = index;
  }
  const offset = -currentSlide * 100;
  document.querySelector('.slider').style.transform = `translateX(${offset}%)`;
}

function nextSlide() {
  showSlide(currentSlide + 1);
}

function prevSlide() {
  showSlide(currentSlide - 1);
}

// Avvia automaticamente lo slider
setInterval(nextSlide, 3000); // Cambia immagine ogni 3 secondi

//menù tab laterale per sitch pagine

// Menù tab laterale per switch pagine
document.addEventListener("DOMContentLoaded", function () {
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".content");

  tabs.forEach(tab => {
    tab.addEventListener("click", function () {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      contents.forEach(content => content.classList.remove("active-content"));

      const activeContent = document.getElementById(tab.getAttribute("data_content"));
      activeContent.classList.add("active-content");

      if (tab.getAttribute("data_content") === "Persone") {
        setTimeout(() => {
          createGenealogyTree();
        }, 100);
      }
    });
  });
});

// Genealogy Tree (Chart initialization is only done once)
var chartInitialized = false; // A flag to ensure the chart is initialized only once

// Function to create the genealogy tree
function createGenealogyTree() {
  // Check if the chart is already initialized to prevent re-rendering
  if (chartInitialized) {
    console.log("Chart already initialized.");
    return;
  }

  // Find the container for the genealogy tree
  var treeContainer = document.getElementById('albero-genealogico');

  // Check if the container is present and if the "Persone" tab is active
  if (!treeContainer || !document.querySelector('#Persone').classList.contains('active-content')) {
    console.log("Container not visible or not active.");
    return;
  }

  // Extract the person ID from the URL to load their data
  var personID = extractPersonIDFromURL();

  // Fetch the data for the person and initialize the chart with the data
  fetchDataForPerson(personID, initializeChart);
}

// Function to extract the person ID from the URL
function extractPersonIDFromURL() {
  var url = window.location.href;
  return url.split("dettaglio_")[1].split(".html")[0]; // Extract the part of the URL that contains the person ID
}

// Function to fetch data for the person from the JSON file
function fetchDataForPerson(personID, callback) {
  fetch('https://raw.githubusercontent.com/FondazioneFedericoZeri/Mercato_dell_arte/main/json/parentela.json')
    .then(response => response.json())
    .then(data => {
      // Extract the relevant person's entity and relationships from the JSON
      var personEntity = data[personID];

      if (!personEntity) {
        showNoDataMessage(); // Show a message when no data is available
        console.log("No data available for person ID:", personID);
        return;
      }

      // Build the hierarchical data structure for the chart
      var rootNode = buildTreeFromData(personEntity);

      if (!rootNode || rootNode.children.length === 0) {
        showNoDataMessage(); // Show message if no data is available
      } else {
        hideNoDataMessage(); // Hide the message
        callback(rootNode); // Pass the root node to initialize the chart
      }
    })
    .catch(error => {
      showNoDataMessage();
      console.error("Failed to fetch data for genealogy tree:", error);
    });
}

// Function to build the tree based on new data
function buildTreeFromData(entity) {
  let persons = entity.Persone; // Get the list of persons
  let relationships = entity.Relazioni; // Get the relationships
  console.log('persone', persons)
  console.log('rel', relationships)

  // Create a map to store nodes for each person
  let nodes = {};

  // Track already added nodes
  let addedNodes = {};

  // Create nodes for each person
  Object.keys(persons).forEach(personID => {
    let person = persons[personID];
    nodes[personID] = {
      name: person["Nome"] || "Unknown",
      nascita: person.Nascita || "",
      morte: person.Morte || "",
      children: []
    };
  });

  // Helper function to add a node one level below (parent-child relationship)
  function addOneLevelBelow(parentID, childID) {
    if (!addedNodes[childID]) {
      console.log(`Adding ${nodes[childID].name} as a child of ${nodes[parentID].name}`);
      nodes[parentID].children.push(nodes[childID]); // Add child to parent
      addedNodes[childID] = true; // Mark as added
    }
  }

  // Helper function to handle spouse (coniuge) relationship — place at the same level
  function handleSpouse(personID1, personID2) {
    if (!addedNodes[personID2]) {
      console.log(`Adding ${nodes[personID2].name} on the same level as ${nodes[personID1].name}`);
      // Add person2 as a sibling of person1 but do not treat it as a child.
      nodes[personID1].spouse = nodes[personID2]; // Link as spouse, no children here
      addedNodes[personID2] = true;
    }
  }

  // Process relationships and add nodes accordingly
  Object.keys(relationships).forEach(relationshipKey => {
    let relation = relationships[relationshipKey];
    let person1 = relation.Persona_1; // The first person in the relationship
    let person2 = relation.Persona_2; // The second person in the relationship
    let relationshipType = relation["Tipo_di_relazione"]; // Relationship type

    console.log(`Processing relationship between ${nodes[person1].name} and ${nodes[person2].name} (${relationshipType})`);

    // Handle parent-child relationships (padre)
    if (relationshipType === "padre") {
      addOneLevelBelow(person1, person2);
    }

    // Handle spouse (coniuge) relationships — they should appear on the same level
    if (relationshipType === "coniuge") {
      handleSpouse(person1, person2);
    }

    // Handle daughter-in-law (nuora) — nuora is treated as a child under spouse
    if (relationshipType === "nuora") {
      if (nodes[person1].spouse) {
        addOneLevelBelow(person1, person2);
      } else {
        addOneLevelBelow(person1, person2); // In case person1 is not yet linked as a spouse
      }
    }
  });

  // After processing, ensure spouses share children
  Object.keys(nodes).forEach(personID => {
    if (nodes[personID].spouse) {
      // Make sure both spouses share the same children
      nodes[personID].spouse.children = nodes[personID].children;
    }
  });

  // Log the final structure of nodes to check if relationships are applied
  console.log("Final tree structure: ", nodes);

  // Return the first person (or whoever is designated as the root)
  return nodes[Object.keys(nodes)[0]]; // Adjust this to determine the root node
}

// Function to show "No data available" message
function showNoDataMessage() {
  var messageDiv = document.createElement('div');
  messageDiv.id = 'no-data-message';
  messageDiv.style.color = 'red';
  messageDiv.innerHTML = 'Albero genealogico al momento non disponibile per questa entità.';

  var treeContainer = document.getElementById('albero-genealogico');
  if (treeContainer) {
    treeContainer.style.display = 'none';
    treeContainer.parentNode.insertBefore(messageDiv, treeContainer);
  }
}

// Function to hide "No data available" message
function hideNoDataMessage() {
  var messageDiv = document.getElementById('no-data-message');
  if (messageDiv) {
    messageDiv.remove();
  }

  var treeContainer = document.getElementById('albero-genealogico');
  if (treeContainer) {
    treeContainer.style.display = 'block';
  }
}


// Function to initialize the tree chart using amCharts 5
function initializeChart(rootNode) {
  am5.ready(function () {
    // Create root element for the chart
    var root = am5.Root.new("albero-genealogico");

    // Add themes
    root.setThemes([
      am5themes_Animated.new(root)
    ]);

    // Create a tree series inside the zoomable container
    var series = root.container.children.push(am5hierarchy.Tree.new(root, {
      singleBranchOnly: false,
      downDepth: 4,
      initialDepth: 10,
      valueField: "value",
      categoryField: "name",
      childDataField: "children",
      nodePaddingTop: 30,
      nodePaddingBottom: 30,
      nodePaddingLeft: 30,
      nodePaddingRight: 30,
      fixed: false
    }));

    // Customize the link between nodes to control distance
    series.links.template.setAll({
      strength: 0.5,
      distance: 1  // Set distance between nodes (default: 50)
    });

    // Disable tooltips
    root.tooltipContainer.set("forceHidden", true);
    series.set("tooltip", null);

    // Configure node template
    series.nodes.template.setup = function (target) {
      var rectangle = target.children.push(am5.RoundedRectangle.new(root, {
        width: 150,
        height: 35,
        centerX: am5.percent(50),
        centerY: am5.percent(50),
        cornerRadiusTL: 10,
        cornerRadiusTR: 10,
        cornerRadiusBL: 10,
        cornerRadiusBR: 10,
        fill: am5.color(0x6794dc)
      }));

      var label = target.children.push(am5.Label.new(root, {
        text: "{name}\n ({nascita}-{morte})",
        centerX: am5.percent(50),
        centerY: am5.percent(50),
        textAlign: "center",
        fill: am5.color(0x000000),
        fontSize: 12
      }));
    };

    // Set data for the chart (e.g., rootNode)
    series.data.setAll([rootNode]);

    // Make the chart appear with animation
    series.appear(1000, 100);

    chartInitialized = true;
  });
}

