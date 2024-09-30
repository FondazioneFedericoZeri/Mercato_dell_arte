
//slider galleria img

let currentSlide = 0;
let sliderInterval;

// Check if the slider or single image is present
function initializeGallery() {
  const slider = document.querySelector('.slider');
  const singleImage = document.querySelector('.single-image-container');

  if (slider) {
    // Start the slider if the slider is present
    console.log("Slider found. Initializing slider.");
    startSlider();
  } else if (singleImage) {
    // If only a single image is present, no need for slider functionality
    console.log("Single image found. No slider needed.");
  } else {
    console.error("No image gallery found.");
  }
}

function startSlider(retries = 0) {
  const slider = document.querySelector('.slider');

  if (!slider) {
    console.error("Slider element not found! Retrying...");
    setTimeout(() => startSlider(retries + 1), 500);  // Retry every 500ms
    return;
  }

  // Start the interval for automatic slides
  sliderInterval = setInterval(nextSlide, 3000); // Change image every 3 seconds
  console.log("Slider initialized and running.");
}

function showSlide(index) {
  const slides = document.querySelectorAll('.slide');
  const slider = document.querySelector('.slider');

  if (!slider) {
    console.error("Slider element not found!");
    return;
  }

  if (index >= slides.length) {
    currentSlide = 0;
  } else if (index < 0) {
    currentSlide = slides.length - 1;
  } else {
    currentSlide = index;
  }

  const offset = -currentSlide * 100;
  slider.style.transform = `translateX(${offset}%)`;
}

function nextSlide() {
  showSlide(currentSlide + 1);
}

function prevSlide() {
  showSlide(currentSlide - 1);
}

// Initialize the gallery on DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  initializeGallery(); // Start the gallery functionality
});


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
    // Ensure default values for name, nascita, and morte
    let name = person["Nome"] || "Unknown";
    let nascita = person.Nascita || "";
    let morte = person.Morte === "in vita" ? "" : (person.Morte || "");

    // Generate label based on the conditions
    let labelText;
    if (nascita === "" && morte === "") {
      labelText = name; // No dash if both nascita and morte are empty
    } else if (morte === "") {
      labelText = `${name}\n (${nascita})`; // Show only nascita
    } else {
      labelText = `${name}\n (${nascita}-${morte})`; // Show nascita-morte
    }

    nodes[personID] = {
      name: name,
      nascita: nascita,
      morte: morte,
      labelText: labelText, // Store the label text for later use
      children: [] // Initialize children as an empty array
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
    if (relationshipType === "padre" || relationshipType === "madre") {
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
  // Check if the message already exists
  var existingMessage = document.getElementById('no-data-message');
  if (existingMessage) {
    return; // If message already exists, do nothing
  }

  // Create the message div and append it
  var messageDiv = document.createElement('div');
  messageDiv.id = 'no-data-message';
  messageDiv.style.color = '#5593C9';
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
      strength: 1,
      distance: 1,  // Set distance between nodes (default: 50)
    });

    series.links.template.adapters.add("stroke", function(stroke, target) {
      return am5.color("#333333");  // Forza il colore arancione
    });
    

    // Disable tooltips
    root.tooltipContainer.set("forceHidden", true);
    series.set("tooltip", null);

    // Configure node template
    series.nodes.template.setup = function (target) {
      var rectangle = target.children.push(am5.RoundedRectangle.new(root, {
        width: 200,
        height: 50,
        centerX: am5.percent(50),
        centerY: am5.percent(50),
        cornerRadiusTL: 10,
        cornerRadiusTR: 10,
        cornerRadiusBL: 10,
        cornerRadiusBR: 10,
        fill: am5.color("#5593C9")
      }));

      var label = target.children.push(am5.Label.new(root, {
        text: "{labelText}",
        centerX: am5.percent(50),
        centerY: am5.percent(50),
        textAlign: "center",
        fill: am5.color("#ffffff"),
        fontSize: 16
      }));
    
      
    };

    // Set data for the chart (e.g., rootNode)
    series.data.setAll([rootNode]);

    // Make the chart appear with animation
    series.appear(1000, 100);

    chartInitialized = true;
  });

}
