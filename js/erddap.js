  Date.prototype.setISO8601 =  Date.prototype.SetISO8601 || function (string) {
      var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" +
          "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?" +
          "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";
      var d = string.match(new RegExp(regexp));

      var offset = 0;
      var date = new Date(d[1], 0, 1);

      if (d[3]) { date.setMonth(d[3] - 1); }
      if (d[5]) { date.setDate(d[5]); }
      if (d[7]) { date.setHours(d[7]); }
      if (d[8]) { date.setMinutes(d[8]); }
      if (d[10]) { date.setSeconds(d[10]); }
      if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
      if (d[14]) {
          offset = (Number(d[16]) * 60) + Number(d[17]);
          offset *= ((d[15] == '-') ? 1 : -1);
      }

      offset -= date.getTimezoneOffset();
      time = (Number(date) + (offset * 60 * 1000));
      this.setTime(Number(time));
      return this;
  }
var timeliER = function(elid,erddap){
   var rand = Math.floor((Math.random()*999999999)+1);
   var mapelid = 'map'+rand;
   var hid = 'h'+rand;
   $('#'+elid).html("<div>"
        +"<div><div style='float: left; width: 20%'>&nbsp;</div><div><h2 id='"+hid+"'>Choose a Model to View</h2></div></div>"
        +"<div><div id='col' style='float: left; width: 20%; height 100%'><ul id='datasets'><li><a href='#overview'>Overview</a></li></div>"
        +"<div>"
        +"</div>"
        +"<div id='"+mapelid+"' class='map'></div>"
        +"<div style='float: left; width: 20%'>&nbsp;</div><div id='erddap_link'></div>"
        +"</div>");

  // Implemented by Rob Fuller at the Irish Marine Institute, standing on the shoulders of giants.
  var map, layersControl;
  var layerMarkers = [];
  var overview = true;
  var replaceMap = function(times){
    overview = false;
    if(map){
      if(map.timeDimensionControl && map.timeDimensionControl._player){
        map.timeDimensionControl._player.stop();
      }
      console.log(map);
      map.remove();
    }
    map = L.map(mapelid, {
      zoom: 10,
      crs: L.CRS.EPSG4326,
      center: [53.3, -9.59],
      fullscreenControl: true,
      timeDimensionControl: true,
      timeDimension: true,
      timeDimensionOptions: {
          times: times,
      },
      timeDimensionControlOptions: {
          playerOptions: {
              loop: true,
              transitionTime: 400,
              buffer: 10
          }
      }
    });
     map.on("click",function(e){
         var layers = e.target._layers;
         var keys = Object.keys(layers).reverse();
         for(var i=0;i<keys.length;i++){
            if(layers[keys[i]].options === undefined){
               continue;
            }
            var erddap_options = layers[keys[i]].options.erddap;
            if(erddap_options !== undefined && erddap_options.meta !== undefined){
               var meta = erddap_options.meta;
               var lat = e.latlng.lat, lng =  e.latlng.lng, ncg = meta.attribute.NC_GLOBAL;
               var latmin = parseFloat(ncg.geospatial_lat_min.value),
                   latmax = parseFloat(ncg.geospatial_lat_max.value),
                   lngmin = parseFloat(ncg.geospatial_lon_min.value),
                   lngmax = parseFloat(ncg.geospatial_lon_max.value);
               if(lat>=latmin && lat <= latmax && lng>=lngmin && lng <= lngmax){
                 showPointChart(layers[keys[i]],erddap_options,e);
                 break;
               }
            }
         }
    });
    var baseLayers = getCommonBaseLayers(map); // see baselayers.js
    layersControl = L.control.layers(null);
    layersControl.addTo(map);
    L.control.coordinates({
        position: "bottomright",
        decimals: 3,
        labelTemplateLat: "Latitude: {y}",
        labelTemplateLng: "Longitude: {x}",
        useDMS: false,
        enableUserInput: false
    }).addTo(map);

    var legend = L.control({position: 'bottomright'});

    legend.onAdd = function (map) {
          var el = document.getElementById("erddapLegend");
          if(el){
             el.parentNode.removeChild(el);
          }
  	  var div = L.DomUtil.create('div', 'info');
             div.innerHTML += '<img width="275px" id="erddapLegend" alt="legend" src="">';
  	  return div;
    };
    legend.addTo(map);
   }


  /*
  var conn3VelocityLayer = L.tileLayer.wms( "http://erddap3.marine.ie/erddap/wms/"+dataset+"/request", {
      layers: dataset+':vectors[sea_water_x_velocity|sea_water_y_velocity]',
      format: 'image/png',
      transparent: true,
      crs: L.CRS.EPSG4326,
      erddap:{
          url: erddap,
          dataset: dataset,
          attributes: ['sea_water_x_velocity','sea_water_y_velocity'],
          vertical: "20.0"
      },
  });
  */


  var addTimeDimensionLayer = function(layer, name, addToMap){
      var timeDimensionLayer = L.timeDimension.layer.wms(layer, {cache: 15, fadeFrames: 10, interpolate: true});
      //layersControl.addOverlay(timeDimensionLayer, name);
      layersControl.addBaseLayer(timeDimensionLayer, name);
      if (addToMap)
          timeDimensionLayer.addTo(map);
          timeDimensionLayer.on("timeload", (function(layer){
            var erddap = layer.options.erddap;
            var t = layer.options.time;
            var img = new Image();
            img.onload = (function(image){
               var el = document.getElementById("erddapLegend");
               if(el){
                el.src = image.src;
               }
            }).bind(null,img);
            var a = "";
            for(var i=0;i<erddap.attributes.length;i++){
               if(i>0){
                  a = a + ",";
               }
               a = a + erddap.attributes[i]+"[("+t+")]";
               if(erddap.vertical !== undefined){
                 a = a + "[("+erddap.vertical+")]";
               }
               a = a + "[][]";
            }
            img.src = erddap.url+"/griddap/"+erddap.dataset+".transparentPng?"+a+"&.legend=Only";
      }).bind(null,layer));
  }
  var mapLatLngBounds = null;

  var rows2oo = function(data){
    var info = {};
    var rows = data["table"]["rows"];
    for(var i=0;i<rows.length;i++){
      if(info[rows[i][0]] === undefined){
         info[rows[i][0]] = {};
      }
      if(info[rows[i][0]][rows[i][1]] === undefined){
         info[rows[i][0]][rows[i][1]] = {};
      }
      info[rows[i][0]][rows[i][1]][rows[i][2]] = {type: rows[i][3], value: rows[i][4]};
    }
    return info;

  };
  var table2array = function(data){
    var answer = [];
    for(var i=0;i<data.table.rows.length;i++){
      var o = {};
      var row = data.table.rows[i];
      for(var k=0;k<row.length;k++){
         o[data.table.columnNames[k]] = row[k];
      }
      answer.push(o);
    }
    return answer;
  }
  var showModelSelector = function(){
    if(map){
      map.remove();
    }
    map = L.map(mapelid, {
      zoom: 10,
      crs: L.CRS.EPSG4326,
      center: [53.3, -9.59],
     });
    overview = true;
   $('#'+hid).text("Choose a Model to View");
   $("#erddap_link").empty();
   getCommonBaseLayers(map);
   map.fitBounds(mapLatLngBounds);
   var layer = L.layerGroup().addTo(map);
   var oms = new OverlappingMarkerSpiderfier(map);
   for(var i = 0;i<layerMarkers.length;i++){
      layerMarkers[i](layer,oms);
   }
   map.fitBounds(mapLatLngBounds);
  }
  var addTimeDimensionLayers = function(layers,nc_global,bounds,times,dataset){
     replaceMap(times);
     map.fitBounds(bounds);
     $('#'+hid).text(nc_global.title.value);
     var $a = $("<a></a>");
     $a.attr('href',erddap+"/griddap/"+dataset+".html");
     $a.attr('title',"Click to access the data directly in Erddap");
     $a.html("Erddap Data Access Form");
     $("#erddap_link").empty().append("Need access to the raw data? ").append($a);
     for(var i=0;i<layers.length;i++){
       addTimeDimensionLayer(layers[i].layer,layers[i].name,layers[i].addToMap);
     }
  }
  var modelref = {"overview": showModelSelector};
  var addErddapLayer = function(infoUrl,wmsUrl,dataset){
   $.getJSON(infoUrl, function(data){
     var info = rows2oo(data);
     if(!info.attribute.time){
        // skip non-time dimensions for the moment...
        return;
     }
     var timeUrl = erddap+"/griddap/"+dataset+".csv?time";
     var xhr = new XMLHttpRequest();
     xhr.open('GET', timeUrl);
     xhr.onload = function(xhr) {
      if (xhr.status !== 200) {
         console.log("http request failed with status",xhr.status);
         return;
      }
      var csv = xhr.responseText;
      var lines = csv.split('\n');
      lines.shift();
      lines.shift();
      var times = lines.join(",");
      var attrs = Object.keys(info.attribute);
      var layers = [];
      for(var i=0;i<attrs.length;i++){

        var attribute = attrs[i];
        if(info.attribute[attribute].colorBarMinimum && info.attribute[attribute].colorBarMaximum){
          var lerddap = {
                url: erddap,
                dataset: dataset,
                attributes: [attribute],
                times: times
            };

          if(info.attribute.NC_GLOBAL.geospatial_vertical_max){
            lerddap.vertical =  info.attribute.NC_GLOBAL.geospatial_vertical_max.value;
          }

          var layer = L.tileLayer.wms(wmsUrl, {
            layers: dataset+':'+attribute,
            format: 'image/png',
            transparent: true,
            abovemaxcolor: "extend",
            belowmincolor: "extend",
            numcolorbands: 40,
            crs: L.CRS.EPSG4326,
            opacity: 0.8,
            erddap: lerddap,
          });
          var colorscalerange = info.attribute[attribute].colorBarMinimum.value + "," +
               info.attribute[attribute].colorBarMaximum.value;
          layer.options.colorscalerange = colorscalerange;
          layer.wmsParams.colorscalerange = colorscalerange;
          layer.options.erddap.meta = info;
          layer.erddap = true;
          layers.push({
              layer: layer,
              name: dataset+": "+info.attribute[attribute].long_name.value + " ("+attribute+")",
              addToMap: layers.length == 0
           });
        }

      }
      if(layers.length){
        var nc_global = info.attribute.NC_GLOBAL;
        var bounds = [[parseFloat(nc_global.geospatial_lat_min.value),parseFloat(nc_global.geospatial_lon_min.value)],
                    [parseFloat(nc_global.geospatial_lat_max.value),parseFloat(nc_global.geospatial_lon_max.value)]];

        modelref[dataset] = addTimeDimensionLayers.bind(null,layers,nc_global,bounds,times,dataset);
        if(!mapLatLngBounds){
          mapLatLngBounds = L.latLngBounds(bounds);
        }
        mapLatLngBounds.extend(bounds);
        var $a = $("<a>"+dataset+"</a>");
        $a.attr('href','#'+dataset);
        $a.attr('title',nc_global.title.value);
        $a.attr('id','a_'+dataset);
        var $li = $("<li></li>");
        $li.append($a);
        $("#datasets").append($li);
        var items = $('#datasets li:gt(0)').get();
        items.sort(function(a,b){
          var keyA = $(a).text();
          var keyB = $(b).text();

          if (keyA < keyB) return -1;
          if (keyA > keyB) return 1;
          return 0;
        });
        var ul = $('#datasets');
        $.each(items, function(i, li){
          ul.append(li);
        });
        var layerMarker = function(bounds,nc_global,dataset,layers,oms){
            var rectangle = L.rectangle(bounds,{weight: 1, fillOpacity: 0, color: '#000000'});
            layers.addLayer(rectangle);
            var link = L.DomUtil.get('a_'+dataset);
            L.DomEvent.addListener(link, 'mouseenter',function(e) {
                this.setStyle({weight: 3, fillOpacity: 0, color: '#FF0000'});
            },rectangle);
            L.DomEvent.addListener(link, 'mouseleave',function(e) {
                this.setStyle({weight: 1, fillOpacity: 0, color: '#000000'});
            },rectangle);
            return;
            var marker = L.marker([bounds[1][0],bounds[1][1]],{title: nc_global.title.value});
            var $html = $("<div></div>");
            $html.append('<h3>'+nc_global.title.value+'</h3>');
            $html.append('<p>'+nc_global.summary.value+'</p>');
            $html.append('<dl><dt>Start</dt><dd>'+nc_global.time_coverage_start.value+'</dd></dl>');
            $html.append('<dl><dt>End</dt><dd>'+nc_global.time_coverage_end.value+'</dd></dl>');
            $html.append("<a href='#"+dataset+"' class='btn btn-success'>View</a>");
            marker.bindPopup($html[0]);
            layers.addLayer(marker);
            oms.addMarker(marker);
       }.bind(null,bounds,nc_global,dataset);
       layerMarkers.push(layerMarker);
       if(location.hash == '#'+dataset){
         modelref[dataset]();
       }else if(overview){
         showModelSelector();
       }
      }
      }.bind(null,xhr);
      xhr.send();
   });
  }

  $.getJSON(erddap+"/wms/index.json", function(data){
     //console.log(data);
     var info = table2array(data);
     for(var i=0;i<info.length;i++){
      //console.log("adding",info[i].Info);
      addErddapLayer(info[i].Info,info[i].wms,info[i]["Dataset ID"]);
     }
  });

  var showPointChart = function(layer,options,e){
      var start_time = options.meta.attribute.NC_GLOBAL.time_coverage_start.value,
          end_time =  options.meta.attribute.NC_GLOBAL.time_coverage_end.value,
          lat = e.latlng.lat,
          lng =  e.latlng.lng;
      var width = 400;
      var height = 300;
      var url = options.url+"/griddap/"+options.dataset+".csv?"+options.attributes[0]+"[("+start_time+"):("+end_time+")]";
      if(options.vertical !== undefined){
        url = url + "[("+options.vertical+")]";
      }
      url = url + "[("+lat+")][("+lng+")]&.draw=lines&.vars=time|"+options.attributes[0];
      var elid = "el"+Math.random();
      var popup = L.popup({maxWidth: 400}).setLatLng(e.latlng).setContent('<div id="'+elid+'"></div>').openOn(map);
      var fillerChart = new Highcharts.Chart({
            chart: {
                renderTo: elid,
                width: width,
                height: height,
                defaultSeriesType: 'spline'
            },
            credits: {
               text: 'loading...',
               href: url,
            },
            title: {
                text: 'Lon: '+popup.getLatLng().lng.toFixed(3)+' Lat: '+popup.getLatLng().lat.toFixed(3),
            },
            xAxis: {
                labels: {
                  categories: []
                },
            },
            yAxis: {
                title: {
                    text: options.meta.attribute[options.attributes[0]].units.value,
                }
            },
            series: []
      });
      popup.setContent(document.getElementById(elid));
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.onload = (function(xhr,elid,options,popup) {
        popup.setContent('<div id="'+elid+'">something went wrong</div>');
        if (xhr.status !== 200) {
          console.log("http request failed with status",xhr.status);
          return;
        }
        var csv = xhr.responseText;
        // remove second label line from erddap csv
        var lines = csv.split('\n');
        lines.splice(1,1);
        var header = lines.shift().split(",");
        var coptions = {
            chart: {
                renderTo: elid,
                width: width,
                height: height,
                defaultSeriesType: 'spline'
            },
            title: {
                text: 'Lon: '+popup.getLatLng().lng.toFixed(3)+' Lat: '+popup.getLatLng().lat.toFixed(3),
            },
            credits: {
               text: 'click to download csv',
               href: url,
            },
            xAxis: {
                type: 'datetime',
                labels: {
                  rotation: 270,
                },
            },
            yAxis: {
                title: {
                    text: options.meta.attribute[options.attributes[0]].units.value,
                }
            },
            plotOptions: {
              series: {
                 cursor: 'pointer',
                 point: {
                   events: {
                     click: function(){
                        map.timeDimension.setCurrentTime(this.x);
                     }
                   }
                 }
              }
            },
            series: []
        };
        var data = [];
        for(var i=0;i<lines.length;i++){
           var parts = lines[i].split(",");
           if(!parts[0]){
             continue;
           }
           var date = new Date().setISO8601(parts[0]).getTime();
           var v = parseFloat(parts[options.vertical === undefined?3:4]);
           data.push([ date, v]);
        }
        coptions.series.push({name: options.meta.attribute[options.attributes[0]].long_name.value + " ("+options.attributes[0]+")", data: data});
        var chart = new Highcharts.Chart(coptions);
        popup.setContent(document.getElementById(elid));
      }).bind(null,xhr,elid,options,popup);
      xhr.send();
  };
  $(window).on('hashchange',function(){
     var loc = location.hash.slice(1);
     if(modelref[loc]){
       modelref[loc]();
     }else{
       showModelSelector();
     }
  });
}
