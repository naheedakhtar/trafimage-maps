import 'jest-canvas-mock';
import OLVectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Map from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Style, Stroke, Text, Fill } from 'ol/style';
import ZoneLayer from './ZoneLayer';

const feature = new Feature({
  geometry: new Point([50, 50]),
  zone: '42',
});

const olLayer = new OLVectorLayer({
  source: new VectorSource({
    features: [feature],
  }),
});

let layer;
let map;
let onClick;
let onMouseOver;

describe('ZoneLayer', () => {
  beforeEach(() => {
    onClick = jest.fn();
    onMouseOver = jest.fn();
    layer = new ZoneLayer({
      name: 'Layer',
      olLayer,
      onClick,
      onMouseOver,
    });
    map = new Map({ view: new View({ resution: 5 }) });
    layer.init(map);
  });

  test('should return the correct default style.', () => {
    const style = layer.defaultStyleFunction(feature, false, false);
    const olStyles = layer.getOlStylesFromObject(style, false, false, feature);

    expect(olStyles.base).toEqual(
      new Style({
        fill: new Fill({
          color: [102, 102, 102, 0.2],
        }),
        stroke: new Stroke({
          color: [102, 102, 102, 0.5],
          width: 1,
        }),
      }),
    );

    expect(olStyles.text).toEqual(
      new Style({
        text: new Text({
          text: '42',
          font: 'bold 13px Arial',
          fill: new Fill({
            color: '#4576A2',
          }),
        }),
      }),
    );
  });

  test('should return the correct select style', () => {
    const style = layer.defaultStyleFunction(feature, true, false);
    const olStyles = layer.getOlStylesFromObject(style, true, false, feature);

    expect(olStyles.base).toEqual(
      new Style({
        zIndex: 1,
        fill: new Fill({
          color: [104, 104, 104, 0.7],
        }),
        stroke: new Stroke({
          color: '#686868',
        }),
      }),
    );

    expect(olStyles.text).toEqual(
      new Style({
        zIndex: 1,
        text: new Text({
          text: '42',
          font: 'bold 13px Arial',
          fill: new Fill({
            color: 'white',
          }),
        }),
      }),
    );
  });
});
