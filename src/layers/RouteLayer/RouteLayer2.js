import 'react-app-polyfill/ie11';
import 'react-app-polyfill/stable';
import qs from 'query-string';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import MapboxStyleLayer from '../MapboxStyleLayer';

/**
 * Layer for visualizing routes.
 *
 * <img src="img/layers/RouteLayer/layer.png" alt="Layer preview" title="Layer preview">
 * @class RouteLayer
 * @extends CasaLayer
 * @param {Object} [options] Layer options.
 *   Default is `{ rail: '#e3000b', bus: '#ffed00', ship: '#0074be' }`.
 */
class RouteLayer2 extends MapboxStyleLayer {
  constructor(options = {}) {
    super(options);

    this.source = options.source;
    this.apiKey = options.apiKey;
    this.set('showPopupOnHover', true);
    this.set('popupComponent', 'CasaRoutePopup');

    this.url = 'https://api.geops.io/routing/v1/';

    this.selectedRouteIds = [];
    this.emptyData = {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    };

    // Show popup only for unique features.
    let ids = [];
    this.featureInfoFilter = (feat, res, idx) => {
      if (!idx) {
        ids = [];
      }
      if (!ids.includes(feat.getId())) {
        ids.push(feat.getId());
        return true;
      }
      return false;
    };

    // Add the geojson source
    this.mapboxLayer.on('load', () => {
      if (
        this.mapboxLayer.mbMap &&
        !this.mapboxLayer.mbMap.getSource(this.source)
      ) {
        this.mapboxLayer.mbMap.addSource(this.source, this.emptyData);
      }
    });

    this.onClick(features => {
      if (features.length) {
        const [feature] = features;
        let route = feature.get('route');
        route = typeof route === 'string' ? JSON.parse(route) : route;
        const { isClickable } = route;

        if (isClickable) {
          this.select([feature]);
        }
      } else {
        this.select([]);
      }
    });
  }

  terminate(map) {
    const { mbMap } = this.mapboxLayer;
    if (!mbMap) {
      return;
    }

    super.terminate(map);

    if (mbMap.getSource(this.source)) {
      mbMap.removeSource(this.source);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  hidePopup(feature) {
    let route = feature.get('route');
    route = typeof route === 'string' ? JSON.parse(route) : route;
    return route.popupContent;
  }

  /**
   * Getting the Mot-features on specific route.
   * @private
   * @param {Object} viaPoints Route Informations
   * @param {String} mot Ask for specific Route
   * @param {Object[]} sequenceProps Properties for the returned features.
   * @returns {array<ol.Feature>} Features
   */
  fetchRouteForMot(viaPoints, mot, sequenceProps) {
    this.abortController = new AbortController();

    const via = viaPoints.map(v => `!${v}`);
    const urlParams = {
      key: this.apiKey || '',
      via: via.join('|'),
      mot,
    };

    const format = new GeoJSON({
      dataProjection: 'EPSG:4326',
      featureProjection: this.map.getView().getProjection(),
    });

    const url = `${this.url}?${qs.stringify(urlParams)}`;
    return fetch(url, { signal: this.abortController.signal })
      .then(res => res.json())
      .then(data => {
        const newData = { ...data };
        if (newData.features) {
          newData.features = newData.features.map((f, idx) => {
            const id = idx + 1;
            const newF = f;
            newF.id = id; // for mapbox highlighting
            newF.properties = { ...newF.properties, ...sequenceProps };
            newF.properties.id = id; // for OL
            return newF;
          });
        }
        this.features = format.readFeatures(data);
        this.mapboxLayer.mbMap.getSource(this.source).setData(data);
        return this.features;
      });
  }

  /**
   * Load routes based on a given configuration.
   * @param {Object[]} routes Routes.
   * @param {boolean} routes[].isSelected If true, the route is
   *   selected initially.
   * @param {boolean} routes[].isClickable If true, the route can be
   *   selected or unselected by click.
   * @param {Object[]} routes[].sequences Route sequences.
   * @param {number} routes[].sequences[].uicFrom UIC number of start station.
   * @param {number} routes[].sequences[].uicTo UIC number of end station.
   * @param {string} routes[].sequences[].mot Method of transportation.
   *   Allowed values are "rail", "bus", "tram", "subway", "gondola",
   *   "funicular" and "ferry"
   * @returns {Promise<Feature[]>} Promise resolving OpenLayers features.
   */
  loadRoutes(routes) {
    const routePromises = [];

    for (let i = 0; i < routes.length; i += 1) {
      let via = [];

      if (!routes[i].sequences) {
        throw new Error('Missing route sequences.');
      }

      for (let j = 0; j < routes[i].sequences.length; j += 1) {
        const { mot, uicFrom, uicTo } = routes[i].sequences[j];
        const nextMot =
          j === routes[i].sequences.length - 1
            ? null
            : routes[i].sequences[j + 1].mot;

        via = via.concat([uicFrom, uicTo]);

        if (mot !== nextMot) {
          const sequenceProps = { route: { ...routes[i], routeId: i }, mot };
          routePromises.push(this.fetchRouteForMot(via, mot, sequenceProps));
          via = [];
        }
      }
    }

    return Promise.all(routePromises).then(data => {
      const sequenceFeatures = data.flat().filter(f => f);
      sequenceFeatures.forEach(f => {
        let route = f.get('route');
        route = typeof route === 'string' ? JSON.parse(route) : route;
        const { routeId, isSelected } = route;
        if (isSelected) {
          this.selectedRouteIds.push(routeId);
        }
      });
      return sequenceFeatures;
    });
  }

  /**
   * Zoom to route.
   * @param {Object} [fitOptions] Options,
   *   see {@link https://openlayers.org/en/latest/apidoc/module-ol_View-View.html ol/View~View}
   */
  zoomToRoute(options) {
    const fitOptions = { padding: [20, 20, 20, 20], ...options };

    const extent = new VectorSource({ features: this.features }).getExtent();
    this.map.getView().fit(extent, fitOptions);
  }

  /**
   * Clears the layer.
   */
  clear() {
    if (this.abortController && !this.abortController.signal.aborted) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.selectedRouteIds = [];
    if (
      this.source &&
      this.mapboxLayer.mbMap &&
      this.mapboxLayer.mbMap.getSource(this.source)
    ) {
      this.mapboxLayer.mbMap.getSource(this.source).setData(this.emptyData);
    }
  }
}

export default RouteLayer2;
