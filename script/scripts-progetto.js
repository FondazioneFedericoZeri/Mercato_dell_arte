am5.ready(function() {


    // Create root element
    // https://www.amcharts.com/docs/v5/getting-started/#Root_element
    var root = am5.Root.new("chartdiv");
    
    
    // Set themes
    // https://www.amcharts.com/docs/v5/concepts/themes/
    root.setThemes([
      am5themes_Animated.new(root)
    ]);
    
    var zoomableContainer = root.container.children.push(
      am5.ZoomableContainer.new(root, {
        width: am5.p100,
        height: am5.p100,
        wheelable: true,
        pinchZoom: true
      })
    );
    
    var zoomTools = zoomableContainer.children.push(am5.ZoomTools.new(root, {
      target: zoomableContainer
    }));
    
    
    // Add series
    // https://www.amcharts.com/docs/v5/charts/word-cloud/
    var series = zoomableContainer.contents.children.push(am5wc.WordCloud.new(root, {
      maxCount:100,
      minWordLength:2,
      maxFontSize:am5.percent(35),
      text: "Accorsi, Albrighi, Antonacci-Efrati, Apolloni, Bacarelli, Bardini, Barsanti, Baslini, Bellini, Bellesi, Bossi, Bruschi, Canessa, Capobianchi, Ciampolini, Contini Bonacossi, Corvisieri, Costantini, Crosa, De Clemente, Di Castro, Ferroni, Freschi, Galliani, Giugni, Grassi, Guidi-Bruscoli, Imbert, Jandolo, Lapicirella, Lazzaroni, Moratilla, Nigro, Orselli, Pagano, Paolini, Pini, Podio, Pospisil, Rambaldi, Romano, Rubinacci, Salocchi, Salvadori, Sambon, Sangiorgi, Segre, Sestieri, Simonetti, Steffanoni, Tavazzi, Tolentino, Viancini, Viezzoli, Villa, Volpi, Volterra, Zabert.",
    }));
    
    
    // Configure labels
    series.labels.template.setAll({
      paddingTop: 5,
      paddingBottom: 5,
      paddingLeft: 5,
      paddingRight: 5,
      fontFamily: "Courier New",
      fontSize: am5.p20
    });
    
    }); // end am5.ready()
