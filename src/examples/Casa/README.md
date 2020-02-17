#

The Casa module is a sub module of trafimage-maps which is integrated in the SBB selling application. It is used for visualizing the planned [route](/docjs.html#routelayer) with different means of transportation and allows the selection of relevant [fare network](/docjs.html#zonelayer).

```jsx
import 'trafimage-maps';
import React, { useEffect, useRef } from 'react';
import RouteLayer2 from 'trafimage-maps/layers/RouteLayer/RouteLayer2';
import ZoneLayer from 'trafimage-maps/layers/ZoneLayer';
import casa from 'trafimage-maps/examples/Casa/topic';

// The `apiKey` used here is for demonstration purposes only.
// Please get your own api key at https://developer.geops.io/.
const apiKey = window.apiKey;

// Intialization of zone layer.
const zoneLayer = new ZoneLayer({
  apiKey: apiKey,
  validFrom: '2019-12-16',
  validTo: '2020-12-01',
});

// Select zones.
zoneLayer.loadZones([
  {
    partnerCode: 801,
    zones: [
      {
        zoneCode: 10,
        zoneName: 'Davos',
        isClickable: true,
      },
    ],
  },
  {
    partnerCode: 490,
    zones: [
      {
        zoneCode: 120,
        isSelected: true,
        isClickable: true,
      },
      {
        zoneCode: 170,
      },
    ],
  },
]);

zoneLayer.onClick(f => {
  console.log('Clicked', f);
});

const baselayer = casa.layers[0];

const routeLayer = new RouteLayer2({
  name: 'ch.sbb.casa.routeLayer',
  apiKey: apiKey,
  mapboxLayer: baselayer,
  source: 'routes',
  beforeId:'5_Label_BP_smaller',
  styleLayers: [
    {
    id: 'ch.sbb.casa.routeLayer_stroke',
    type: 'line',
    source: 'routes',
    paint: {
      'line-width': 8,
      'line-color': 'black',
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1,
        0,
      ],
    }
  },
  {
    id: 'ch.sbb.casa.routeLayer',
    type: 'line',
    source: 'routes',
    paint: {
      'line-width': 6,
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1,
        0.5,
      ],
      'line-color': {
        "property": "mot",
        "type": "categorical",
        "stops": [
          [
            'bus',
            'rgb(255, 255, 0)'
          ],
          [
            'funicular',
            'rgb(0, 151, 59)'
          ],
          [
            'ship',
            'rgb(255, 255, 255)'
          ],
        ]
      },
    }, 
  },{
    id: 'ch.sbb.casa.routeLayer_rail',
    type: 'line',
    source: 'routes',
    filter: ['==', ['get','mot'], 'rail'],
    paint: {
      'line-width': 6,
      'line-opacity':
        [ 'case',
          [ 'any',
            ['boolean', ['feature-state', 'select'], false],
            ['boolean', ['feature-state', 'hover'], false],
          ],
          1,
          0.5,
        ],
      'line-color': [
        'case',
        [ 'all',
          ['boolean', ['feature-state', 'select'], false],
        ],
        'green',
        'rgb(235, 0, 0)',
      ]
    },
  },{
    id: 'ch.sbb.casa.routeLayer',
    type: 'line',
    source: 'routes',
    paint: {
      'line-width': 6,
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1,
        0.5,
      ],
      'line-color': {
        "property": "mot",
        "type": "categorical",
        "stops": [
          [
            'rail',
            'rgb(235, 0, 0)'
          ],
          [
            'bus',
            'rgb(255, 255, 0)'
          ],
          [
            'funicular',
            'rgb(0, 151, 59)'
          ],
          [
            'ship',
            'rgb(255, 255, 255)'
          ],
        ]
      },
    },
  }, 
  {
        'id': 'ch.sbb.casa.routeLayer_arrow',
        'type': 'symbol',
        'source': 'routes',
        'layout': {
          'symbol-placement': 'line',
          'symbol-spacing': 100,
          // 'icon-ignore-placement': true,
          'icon-image': 'triangle_11',"icon-optional": true,
          'icon-size': 2,
          'icon-rotate': 90,
          'visibility': 'visible'
        }
      }],
});

baselayer.on('load', () => {  
  // Visualize a route on the map.
  routeLayer
    .loadRoutes([
      {
        isClickable: true,
        popupTitle: 'Route St. Gallen >> Zürich',
        popupContent: {
          Von: 'St. Gallen',
          Nach: 'Zürich HB',
        },
        sequences: [
          {
            uicFrom: 8503000,
            uicTo: 8506302,
            mot: 'rail',
          },
        ],
      },
    ])
    .then(f => {
      console.log(f);
      routeLayer.zoomToRoute();
    });
});

routeLayer.onClick(f => {
  console.log('Clicked', f);
});

const App = () => {
  const ref = useRef();

  useEffect(() => {
    const map = ref.current;
    map.topics =  [{...casa, layers: [...casa.layers, zoneLayer, routeLayer]}];

    return () => {
      map.topics = null;
    };
  }, []);

  return (
    <div className="container">
      <trafimage-maps ref={ref} apiKey={apiKey}/>
    </div>
  );
}

<App />

```
